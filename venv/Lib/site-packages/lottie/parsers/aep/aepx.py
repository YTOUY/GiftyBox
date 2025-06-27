import io

from .riff import RiffChunk, RiffList
from .aep_riff import AepParser


def aepx_to_chunk(element, parser):
    header = element.tag.rsplit("}", 1)[-1].ljust(4)
    if header == "ProjectXMPMetadata":
        chunk = RiffChunk(header, 0, element.text)
    elif header == "string":
        txt = element.text or ""
        chunk = RiffChunk("Utf8", len(txt), txt)
    elif header == "numS":
        return RiffChunk(header, 0, int(element[0].text))
    elif header == "ppSn":
        return RiffChunk(header, 8, float(element[0].text))
    elif "bdata" in element.attrib:
        hex = element.attrib["bdata"]
        raw = bytes(int(hex[i:i+2], 16) for i in range(0, len(hex), 2))

        if header in parser.chunk_parsers:
            bdata = io.BytesIO(raw)
            parser.file = bdata
            data = parser.chunk_parsers[header](parser, len(raw))
        else:
            data = raw

        chunk = RiffChunk(header, len(raw), data)
    else:
        if header == "AfterEffectsProject":
            header = "RIFX"
            type = ""
        elif header in AepParser.utf8_containers:
            type = ""
        else:
            type = header
            header = "LIST"

        if header == "LIST":
            parser.on_list_start(type)

        data = RiffList(type, tuple(aepx_to_chunk(child, parser) for child in element))
        chunk = RiffChunk(header, 0, data)

        if header == "LIST":
            parser.on_list_end(type)

    parser.on_chunk(chunk)

    return chunk
