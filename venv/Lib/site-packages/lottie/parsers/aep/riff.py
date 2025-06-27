import struct
from dataclasses import dataclass


class Endianness:
    def read(self, file, size):
        return self.decode(file.read(size))

    def decode(self, data):
        raise NotImplementedError()

    def decode_2comp(self, data):
        uint = self.decode(data)
        sbit = 1 << (len(data) * 8 - 1)
        if uint & sbit:
            return uint - (sbit << 1)
        else:
            return uint


class BigEndian(Endianness):
    @staticmethod
    def decode_data(data):
        value = 0
        for byte in data:
            value <<= 8
            value |= byte

        return value

    def decode(self, data):
        return self.decode_data(data)

    def decode_float64(self, data):
        return struct.unpack(">d", data)[0]

    def decode_float32(self, data):
        return struct.unpack(">f", data)[0]


class LittleEndian(Endianness):
    def decode(self, data):
        return BigEndian.decode_data(reversed(data))

    def decode_float64(self, data):
        return struct.unpack("<d", data)[0]

    def decode_float32(self, data):
        return struct.unpack("<f", data)[0]


@dataclass
class RiffChunk:
    header: str
    length: int
    data: bytes


@dataclass
class RiffList:
    type: str
    children: tuple

    def find(self, header):
        for ch in self.children:
            if ch.header == header:
                return ch
            elif ch.header == "LIST" and ch.data.type == header:
                return ch

    def find_list(self, type):
        for ch in self.children:
            if ch.header == "LIST" and ch.data.type == type:
                return ch

    def find_multiple(self, *headers):
        headers = list(headers)
        found = [None] * len(headers)
        for ch in self.children:
            for i, header in enumerate(headers):
                if ch.header == header:
                    headers[i] = None
                    found[i] = ch
                    break
                elif ch.header == "LIST" and ch.data.type == header:
                    headers[i] = None
                    found[i] = ch
                    break

        return found


sint = object()


@dataclass
class RiffHeader:
    endianness: Endianness
    length: int
    format: str


class RiffParser:
    def __init__(self, file):
        self.file = file
        magic = self.read(4)
        if magic == b"RIFF":
            endian = LittleEndian()
        elif magic == b"RIFX":
            endian = BigEndian()
        else:
            raise Exception("Expected RIFF or RIFX")

        self.endian = endian
        length = self.read_number(4)
        self.end = file.tell() + length
        format = self.read_str(4)

        self.header = RiffHeader(self.endian, length, format)
        self.chunk_parsers = {}
        self.weird_lists = {}

    def read(self, length):
        return self.file.read(length)

    def read_str(self, length):
        return self.read(length).decode("ascii")

    def read_number(self, length):
        return self.endian.read(self.file, length)

    def read_float(self, length):
        if length == 4:
            return self.endian.decode_float32(self.read(4))
        elif length == 8:
            return self.endian.decode_float64(self.read(8))
        else:
            raise TypeError("Invalid float size %s" % length)

    def read_chunk(self, chunk_max_end):
        header = self.read_str(4)

        length = self.read_number(4)

        if length + self.file.tell() > chunk_max_end:
            length = chunk_max_end - self.file.tell()

        if header == "LIST":
            end = self.file.tell() + length
            type = self.read_str(4)
            if type in self.weird_lists:
                data = StructuredData()
                data.type = type
                data.data = self.weird_lists[type](self, length-4)
            else:
                self.on_list_start(type)
                children = []
                while self.file.tell() < end:
                    children.append(self.read_chunk(end))
                data = RiffList(type, tuple(children))
                self.on_list_end(type)
        elif header in self.chunk_parsers:
            data = self.chunk_parsers[header](self, length)
        else:
            data = self.read(length)

        if data is None:
            raise Exception("Incomplete chunk")

        chunk = RiffChunk(header, length, data)

        self.on_chunk(chunk)

        # Skip pad byte
        if length % 2:
            self.read(1)

        return chunk

    def __iter__(self):
        while True:
            if self.file.tell() >= self.end:
                return

            yield self.read_chunk(self.end)

    def on_chunk(self, chunk):
        pass

    def on_list_start(self, type):
        pass

    def on_list_end(self, type):
        pass

    def read_sub_chunks(self, length):
        end = self.file.tell() + length
        children = []
        while self.file.tell() < end:
            children.append(self.read_chunk(end))
        return RiffList("", tuple(children))

    def parse(self):
        return RiffChunk(
            "RIFX" if isinstance(self.endian, BigEndian) else "RIFF",
            self.end,
            RiffList("", tuple(self))
        )


class StructuredData:
    def __init__(self):
        self.raw_bytes = b''


class StructuredReader:
    def __init__(self, parser, length):
        self.value = StructuredData()
        self.index = 0
        self.parser = parser
        self.length = length
        self.to_read = length

    def skip(self, byte_count):
        self.read_attribute("", byte_count, bytes)

    def read_attribute_string0(self, name, length):
        self.set_attribute(name, self.read_string0(length))

    def set_attribute(self, name, value):
        if name == "":
            name = "_%s" % self.index
            self.index += 1

        setattr(self.value, name, value)

    def read_attribute(self, name, size, type):
        self.set_attribute(name, self.read_value(size, type))

    def read_attribute_array(self, name, count, length, type):
        self.set_attribute(name, self.read_array(count, length, type))

    def finalize(self):
        if self.to_read:
            self.skip(self.to_read)

    def read_raw(self, length):
        raw = self.parser.read(length)
        self.to_read -= length
        self.value.raw_bytes += raw
        return raw

    def read_string0(self, length):
        read = self.read_raw(length)

        try:
            read = read[:read.index(b'\0')]
        except ValueError:
            pass

        try:
            return read.decode("utf8")
        except UnicodeDecodeError:
            return read

    def read_array(self, count, length, type):
        value = []
        for i in range(count):
            value.append(self.read_value(length, type))
        return value

    def read_value(self, length, type):
        if isinstance(type, list):
            val = []
            for name, size, subtype in type:
                val.append(self.read_value(size, subtype))
            return val

        if length > self.to_read:
            raise Exception("Not enough data in chunk")

        data = self.read_raw(length)

        if type is bytes:
            return data
        elif type is int:
            return self.parser.endian.decode(data)
        elif type is sint:
            return self.parser.endian.decode_2comp(data)
        elif type is str:
            return data.decode("utf8")
        elif type is float:
            if length == 8:
                return self.parser.endian.decode_float64(data)
            elif length == 4:
                return self.parser.endian.decode_float32(data)
            else:
                TypeError("Wrong size for float: %s" % length)
        else:
            raise TypeError("Unknown value type %s" % type)

    def attr_bit(self, name, byte, bit, attr="attrs"):
        setattr(self.value, name, (getattr(self.value, attr)[byte] & (1 << bit)) != 0)

    def fraction(self, name, num="_num", den="_den"):
        setattr(self.value, name, getattr(self.value, name + num) / getattr(self.value, name + den))
