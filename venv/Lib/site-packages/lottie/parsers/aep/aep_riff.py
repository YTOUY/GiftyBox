import io
import json
import enum
import base64
from xml.etree import ElementTree

from PIL import ImageCms

from ...nvector import NVector

from .riff import RiffParser, StructuredReader, BigEndian, StructuredData, sint
from .gradient_xml import xml_value_to_python
from .cos import CosParser


class ListType(enum.Enum):
    Shape = enum.auto()
    Keyframe = enum.auto()
    Other = enum.auto()


class KeyframeType(enum.Enum):
    MultiDimensional = enum.auto()
    Position = enum.auto()
    NoValue = enum.auto()
    Color = enum.auto()


class EssentialType(enum.Enum):
    Scalar = 2
    Color = 4
    Position = 5
    Comment = 8
    MultiDimensional = 9
    Group = 10
    Enum = 13


class AepParser(RiffParser):
    utf8_containers = ["tdsn", "fnam", "pdnm"]

    def __init__(self, file):
        if file is not None:
            super().__init__(file)

            if self.header.format != "Egg!":
                raise Exception("Not an AEP file")
        else:
            # XML initialization
            self.end = 0
            self.endian = BigEndian()

        self.chunk_parsers = {
            "Utf8": AepParser.read_utf8,
            "alas": AepParser.read_utf8,
            "tdmn": AepParser.read_mn,
            "cdta": AepParser.read_cdta,
            "ldta": AepParser.read_ldta,
            "idta": AepParser.read_idta,
            "tdb4": AepParser.read_tdb4,
            "cdat": AepParser.read_cdat,
            "lhd3": AepParser.read_lhd3,
            "ldat": AepParser.read_ldat,
            "ppSn": RiffParser.read_float,
            "tdum": RiffParser.read_float,
            "tduM": RiffParser.read_float,
            "tdsb": AepParser.read_number,
            "pprf": AepParser.read_pprf,
            "fvdv": AepParser.read_number,
            "ftts": AepParser.read_number,
            "fifl": AepParser.read_number,
            "fipc": AepParser.read_number,
            "fiop": AepParser.read_number,
            "foac": AepParser.read_number,
            "fiac": AepParser.read_number,
            "wsnm": AepParser.read_utf16,
            "fcid": AepParser.read_number,
            "fovc": AepParser.read_number,
            "fovi": AepParser.read_number,
            "fits": AepParser.read_number,
            "fivc": AepParser.read_number,
            "fivi": AepParser.read_number,
            "fidi": AepParser.read_number,
            "fimr": AepParser.read_number,
            "CsCt": AepParser.read_number,
            "CapL": AepParser.read_number,
            "CcCt": AepParser.read_number,
            "CprC": AepParser.read_number,
            "mrid": AepParser.read_number,
            "numS": AepParser.read_number,
            "shph": AepParser.read_shph,
            "otda": AepParser.read_otda,
            "opti": AepParser.read_opti,
            "sspc": AepParser.read_sspc,
            "parn": AepParser.read_number,
            "pard": AepParser.read_pard,
            "btdk": AepParser.read_btdk,
            "NmHd": AepParser.read_nmhd,
            "tdpi": AepParser.read_number,
            "tdps": lambda self, len: self.endian.decode_2comp(self.file.read(len)),
            "tdli": AepParser.read_number,
            "cmta": AepParser.read_mn,
            "mkif": AepParser.read_mkif,
            "blsv": AepParser.read_number,
            "blsi": AepParser.read_number,
            "CCId": AepParser.read_number,
            "CLId": AepParser.read_number,
            "CDim": AepParser.read_number,
            "CTyp": AepParser.read_ctyp,
            "StVS": AepParser.read_stvs,
            "Smin": AepParser.read_essential_value,
            "Smax": AepParser.read_essential_value,
            "CVal": AepParser.read_essential_value,
            "CDef": AepParser.read_essential_value,
            "fips": AepParser.read_fips,
            "svap": AepParser.read_svap,
            "head": AepParser.read_head,
        }
        for ch in self.utf8_containers:
            self.chunk_parsers[ch] = RiffParser.read_sub_chunks
        self.weird_lists = {
            "btdk": AepParser.read_btdk,
        }
        self.prop_dimension = None
        self.list_type = ListType.Other
        self.keyframe_type = KeyframeType.MultiDimensional
        self.ldat_size = 0
        self.keep_ldat_bytes = False
        self.essential_type = EssentialType.MultiDimensional

    def read_shph(self, length):
        reader = StructuredReader(self, length)
        reader.skip(3)
        reader.read_attribute("attrs", 1, bytes)
        # Relative to the layer position
        reader.read_attribute_array("top_left", 2, 4, float)
        reader.read_attribute_array("bottom_right", 2, 4, float)
        reader.skip(4)
        reader.finalize()
        reader.attr_bit("open", 0, 3)
        return reader.value

    def read_mn(self, length):
        return self.read(length).strip(b"\0").decode("utf8")

    def read_pprf(self, length):
        return ImageCms.ImageCmsProfile(io.BytesIO(self.read(length)))

    def read_tdb4(self, length):
        reader = StructuredReader(self, length)
        reader.skip(2) # db 99
        reader.read_attribute("components", 2, int)
        reader.read_attribute("attrs", 2, bytes)
        reader.read_attribute("", 1, bytes) # 00
        reader.read_attribute("", 1, bytes) # 03 iff position, else 00
        reader.read_attribute("", 2, bytes) # ffff 0002 0001
        reader.read_attribute("", 2, bytes) # ffff 0004 0000 0007
        reader.read_attribute("time_den", 4, int)
        reader.read_attribute("", 8, float) # most of the time 0.0001
        reader.read_attribute("", 8, float) # most of the time 1.0, sometimes 1.777
        reader.read_attribute("", 8, float) # 1.0
        reader.read_attribute("", 8, float) # 1.0
        reader.read_attribute("", 8, float) # 1.0
        reader.read_attribute("type", 4, bytes)
        reader.read_attribute("", 1, bytes) # Seems somehow correlated with the previous byte
        reader.read_attribute("", 7, bytes) # bunch of 00
        reader.read_attribute("animated", 1, int) # 01 iff animated
        reader.read_attribute("", 7, bytes) # bunch of 00
        reader.read_attribute("", 4, bytes) # Usually 0, probs flags
        reader.read_attribute("", 4, int) # most likely flags, only last byte seems to contain data
        reader.read_attribute("", 8, float) # always 0.0
        reader.read_attribute("", 8, float) # mostly 0.0, sometimes 0.333
        reader.read_attribute("", 8, float) # always 0.0
        reader.read_attribute("", 8, float) # mostly 0.0, sometimes 0.333
        reader.read_attribute("", 4, bytes) # probs some flags
        reader.read_attribute("", 4, bytes) # probs some flags

        reader.finalize()
        reader.attr_bit("position", 1, 3)
        reader.attr_bit("static", 1, 0)

        reader.attr_bit("no_value", 1, 0, "type")
        reader.attr_bit("color", 3, 0, "type")
        reader.attr_bit("integer", 3, 2, "type")
        data = reader.value

        self.prop_dimension = data.components
        if data.position:
            self.keyframe_type = KeyframeType.Position
        elif data.color:
            self.keyframe_type = KeyframeType.Color
        elif data.no_value:
            self.keyframe_type = KeyframeType.NoValue
        else:
            self.keyframe_type = KeyframeType.MultiDimensional

        return data

    def read_cdat(self, length):
        dim = self.prop_dimension
        self.prop_dimension = None

        if dim is None or length < dim * 8:
            return self.read(length)

        value = StructuredReader(self, length)
        value.read_attribute_array("value", dim, 8, float)
        if value.to_read % 8 == 0:
            value.read_attribute_array("", value.to_read // 8, 8, float)
        value.finalize()
        return value.value

    def read_cdta(self, length):
        reader = StructuredReader(self, length)

        reader.read_attribute("resolution_x", 2, int)
        reader.read_attribute("resolution_y", 2, int)
        reader.read_attribute("framerate_den", 4, int)
        reader.read_attribute("framerate_num", 4, int)
        reader.fraction("framerate")
        reader.skip(8)
        reader.read_attribute("playhead_num", 4, sint)
        reader.read_attribute("playhead_den", 4, int)
        reader.fraction("playhead")
        reader.read_attribute("start_time_num", 4, sint)
        reader.read_attribute("start_time_den", 4, int)
        reader.fraction("start_time")
        reader.read_attribute("end_time_num", 4, sint)
        reader.read_attribute("end_time_den", 4, int)
        reader.fraction("end_time")
        reader.read_attribute("comp_duration_num", 4, sint)
        reader.read_attribute("comp_duration_den", 4, int)
        reader.fraction("comp_duration")
        reader.read_attribute_array("color", 3, 1, int)
        reader.skip(84)

        reader.read_attribute("attrs", 1, bytes)
        reader.attr_bit("shy", 0, 0)
        reader.attr_bit("motion_blur", 0, 3)
        reader.attr_bit("frame_blending", 0, 4)
        reader.attr_bit("preserve_framerate", 0, 5)
        reader.attr_bit("preserve_resolution", 0, 7)

        reader.read_attribute("width", 2, int)
        reader.read_attribute("height", 2, int)
        reader.read_attribute("pixel_ratio_width", 4, int)
        reader.read_attribute("pixel_ratio_height", 4, int)
        reader.skip(4)
        reader.read_attribute("frame_rate_int", 2, int)
        reader.skip(16)
        reader.read_attribute("shutter_angle", 2, int)
        reader.read_attribute("shutter_phase", 4, sint)
        reader.skip(16)
        reader.read_attribute("samples_limit", 4, int)
        reader.read_attribute("samples_per_frame", 4, int)

        reader.finalize()
        return reader.value

    def read_ldta(self, length):
        reader = StructuredReader(self, length)

        # 0
        reader.read_attribute("layer_id", 4, int)
        # 4
        reader.read_attribute("quality", 2, int)
        reader.skip(2)
        # 8
        reader.read_attribute("stretch_num", 4, int)
        # 12
        reader.read_attribute("start_time_num", 4, sint)
        reader.read_attribute("start_time_den", 4, int)
        # 20
        reader.read_attribute("in_time_num", 4, sint)
        reader.read_attribute("in_time_den", 4, int)
        # 28
        reader.read_attribute("out_time_num", 4, sint)
        reader.read_attribute("out_time_den", 4, int)
        # 37
        reader.read_attribute("attrs", 4, bytes)
        # 40
        reader.read_attribute("source_id", 4, int)
        # 44
        reader.skip(17)
        reader.read_attribute("color", 1, int)
        reader.skip(2)
        # 64
        reader.read_attribute_string0("name", 32)
        # 96
        reader.skip(11)
        reader.read_attribute("matte_mode", 1, int)
        reader.read_attribute("stretch_den", 4, int)
        reader.skip(19)
        # 131
        reader.read_attribute("type", 1, int)
        # 132
        reader.read_attribute("parent_id", 4, int)
        reader.skip(24)
        if reader.to_read > 4:
            reader.read_attribute("track_matte_id", 4, int)

        reader.finalize()

        reader.attr_bit("bicubic", 1, 6)
        reader.attr_bit("guide", 2, 1)

        reader.attr_bit("auto_orient", 2, 0)
        reader.attr_bit("adjustment", 2, 1)
        reader.attr_bit("ddd", 2, 2)
        reader.attr_bit("solo", 2, 3)
        reader.attr_bit("null", 2, 7)

        reader.attr_bit("visible", 3, 0)
        reader.attr_bit("effects", 3, 2)
        reader.attr_bit("motion_blur", 3, 3)
        reader.attr_bit("locked", 3, 5)
        reader.attr_bit("shy", 3, 6)
        reader.attr_bit("rasterize", 3, 7)

        reader.fraction("stretch")
        reader.fraction("start_time")
        reader.fraction("in_time")
        reader.fraction("out_time")

        return reader.value

    def read_idta(self, length):
        reader = StructuredReader(self, length)

        reader.read_attribute("type", 2, int)
        reader.skip(14)
        reader.read_attribute("id", 4, int)
        reader.skip(38)
        reader.read_attribute("color", 1, int)

        reader.finalize()

        reader.value.type_name = "?"
        if reader.value.type == 4:
            reader.value.type_name = "composition"
        elif reader.value.type == 1:
            reader.value.type_name = "folder"
        elif reader.value.type == 7:
            reader.value.type_name = "footage"

        return reader.value

    def read_lhd3(self, length):
        reader = StructuredReader(self, length)
        reader.skip(10)
        reader.read_attribute("count", 2, int)
        reader.skip(6)
        reader.read_attribute("item_size", 2, int)
        reader.skip(3)
        reader.read_attribute("type", 1, int)
        reader.finalize()
        self.ldat_size = reader.value.count
        return reader.value

    def read_ldat_item_bezier(self, length):
        reader = StructuredReader(self, length)
        reader.read_attribute("x", 4, float)
        reader.read_attribute("y", 4, float)
        reader.finalize()
        return reader.value

    def read_ldat_keyframe_common(self, length):
        reader = StructuredReader(self, length)
        reader.read_attribute("time_num", 4, sint)
        reader.skip(1)
        reader.read_attribute("ease_mode", 1, int)
        reader.read_attribute("color", 1, int)
        reader.read_attribute("attrs", 1, bytes)

        reader.value.linear = reader.value.ease_mode == 1
        reader.value.hold = reader.value.ease_mode == 2
        reader.value.ease = reader.value.ease_mode == 3

        reader.attr_bit("continuous_bezier", 0, 3)
        reader.attr_bit("auto_bezier", 0, 4)
        reader.attr_bit("roving", 0, 5)

        return reader

    def read_ldat_keyframe_position(self, length):
        reader = self.read_ldat_keyframe_common(length)
        reader.skip(8)
        reader.read_attribute("", 8, float)
        reader.read_attribute("in_speed", 8, float)
        reader.read_attribute("in_influence", 8, float)
        reader.read_attribute("out_speed", 8, float)
        reader.read_attribute("out_influence", 8, float)
        reader.read_attribute_array("value", self.prop_dimension, 8, float)
        reader.read_attribute_array("pos_tan_in", self.prop_dimension, 8, float)
        reader.read_attribute_array("pos_tan_out", self.prop_dimension, 8, float)
        reader.finalize()
        return reader.value

    def read_ldat_keyframe_no_value(self, length):
        reader = self.read_ldat_keyframe_common(length)
        reader.skip(8)
        if reader.to_read >= 8 * 6:
            reader.read_attribute("", 8, float)
            reader.read_attribute("in_speed", 8, float)
            reader.read_attribute("in_influence", 8, float)
            reader.read_attribute("out_speed", 8, float)
            reader.read_attribute("out_influence", 8, float)
            reader.skip(8)
        reader.finalize()
        return reader.value

    def read_ldat_keyframe_multidimensional(self, length):
        reader = self.read_ldat_keyframe_common(length)
        reader.read_attribute_array("value", self.prop_dimension, 8, float)
        reader.read_attribute_array("in_speed", self.prop_dimension, 8, float)
        reader.read_attribute_array("in_influence", self.prop_dimension, 8, float)
        reader.read_attribute_array("out_speed", self.prop_dimension, 8, float)
        reader.read_attribute_array("out_influence", self.prop_dimension, 8, float)
        reader.finalize()
        return reader.value

    def read_ldat_keyframe_color(self, length):
        reader = self.read_ldat_keyframe_common(length)
        reader.read_attribute_array("", 2, 8, float)
        reader.read_attribute("in_speed", 8, float)
        reader.read_attribute("in_influence", 8, float)
        reader.read_attribute("out_speed", 8, float)
        reader.read_attribute("out_influence", 8, float)
        reader.read_attribute_array("value", self.prop_dimension, 8, float)
        reader.read_attribute_array("", reader.to_read // 8, 8, float)
        reader.finalize()
        return reader.value

    def read_ldat_keyframe_unknown(self, length):
        reader = self.read_ldat_keyframe_common(length)
        reader.finalize()
        return reader.value

    def read_ldat_item_raw(self, length):
        return self.read(length)

    def read_ldat(self, length):
        item_func = None

        if self.list_type == ListType.Other:
            item_func = self.read_ldat_item_raw
            array_name = "items"
        elif self.list_type == ListType.Shape:
            item_func = self.read_ldat_item_bezier
            array_name = "points"
        elif self.list_type == ListType.Keyframe:
            array_name = "keyframes"

            if self.keyframe_type == KeyframeType.Position:
                item_func = self.read_ldat_keyframe_position
            elif self.keyframe_type == KeyframeType.NoValue:
                item_func = self.read_ldat_keyframe_no_value
            elif self.keyframe_type == KeyframeType.Color:
                item_func = self.read_ldat_keyframe_color
            else:
                item_func = self.read_ldat_keyframe_multidimensional

            #item_func = self.read_ldat_keyframe_unknown

            self.keyframe_type = KeyframeType.MultiDimensional

        item_count = self.ldat_size
        item_size = length // item_count
        leftover = length % item_count
        value = StructuredData()
        items = []

        for i in range(item_count):
            item = item_func(item_size)
            if self.keep_ldat_bytes:
                if isinstance(item, bytes):
                    value.raw_bytes += item
                else:
                    value.raw_bytes += item.raw_bytes
            items.append(item)

        setattr(value, array_name, items)

        if leftover:
            value._leftover = self.read(leftover)

        return value

    def on_list_start(self, type):
        if type == "shap":
            self.list_type = ListType.Shape
        elif type == "tdbs":
            self.list_type = ListType.Keyframe

    def on_list_end(self, type):
        if type == "shap":
            self.list_type = ListType.Other
        elif type == "tdbs":
            self.list_type = ListType.Other

    def read_utf8(self, length):
        data = self.read(length).decode("utf8")
        if data.startswith("<?xml version='1.0'?>"):
            dom = ElementTree.fromstring(data)
            if dom.tag == "prop.map":
                return xml_value_to_python(dom)
            else:
                return dom
        elif data.startswith("{") and data.endswith("}"):
            try:
                jdata = json.loads(data)
                if "baseColorProfile" in jdata:
                    jdata["baseColorProfile"]["colorProfileData"] = ImageCms.ImageCmsProfile(io.BytesIO(
                        base64.b64decode(jdata["baseColorProfile"]["colorProfileData"])
                    ))
                return jdata
            except Exception:
                pass

        return data

    def read_utf16(self, length):
        return self.read(length).decode("utf16")

    def read_otda(self, length):
        reader = StructuredReader(self, length)
        reader.read_attribute("x", 8, float)
        reader.read_attribute("y", 8, float)
        reader.read_attribute("z", 8, float)
        reader.finalize()
        return reader.value

    def read_opti(self, length):
        reader = StructuredReader(self, length)
        reader.read_attribute("type", 4, str)
        if reader.value.type == "Soli":
            reader.skip(6)
            reader.read_attribute("a", 4, float)
            reader.read_attribute("r", 4, float)
            reader.read_attribute("g", 4, float)
            reader.read_attribute("b", 4, float)
            reader.read_attribute_string0("name", 256)
        reader.finalize()
        return reader.value

    def read_sspc(self, length):
        reader = StructuredReader(self, length)
        reader.skip(32)
        reader.read_attribute("width", 2, int)
        reader.skip(2)
        reader.read_attribute("height", 2, int)
        reader.skip(2)
        reader.read_attribute("frame_count", 2, int)
        reader.finalize()
        return reader.value

    def read_pard(self, length):
        reader = StructuredReader(self, length)
        reader.skip(15)
        reader.read_attribute("type", 1, int)
        reader.read_attribute_string0("name", 32)
        reader.skip(8)

        if reader.value.type == 2 or reader.value.type == 3: # Scalar / Angle
            reader.read_attribute("last_value", 4, sint)
            reader.value.last_value = reader.value.last_value / 0x10000
            reader.skip(4)
            reader.skip(64)
            reader.skip(4)
            reader.read_attribute("min_value", 2, sint)
            reader.skip(2)
            reader.read_attribute("max_value", 2, sint)
        elif reader.value.type == 4: # Boolean
            reader.read_attribute("last_value", 4, int)
            reader.read_attribute("default_value", 1, int)
            reader.skip(3)
            reader.skip(44)
            reader.read_attribute("", 4, float)
            reader.skip(4)
            reader.read_attribute("", 4, float)
        elif reader.value.type == 5: # Color
            reader.read_attribute_array("last_value", 4, 1, int)
            reader.read_attribute_array("default_value", 4, 1, int)
            reader.skip(64)
            reader.read_attribute_array("max_value", 4, 1, int)
        elif reader.value.type == 6: # 2D
            reader.read_attribute("last_value_x", 4, sint)
            reader.read_attribute("last_value_y", 4, sint)
            reader.value.last_value = NVector(reader.value.last_value_x, reader.value.last_value_y) / 0x80
        elif reader.value.type == 7: # Enum
            reader.read_attribute("last_value", 4, int)
            reader.read_attribute("option_count", 2, int)
            reader.read_attribute("default_value", 2, int)
            reader.skip(44)
            reader.read_attribute("", 4, float)
            reader.skip(4)
            reader.read_attribute("", 4, float)
        elif reader.value.type == 10: # Slider
            reader.read_attribute("last_value", 8, float)
            reader.skip(44)
            reader.read_attribute("", 4, float)
            reader.skip(4)
            reader.read_attribute("max_value", 4, float)
        elif reader.value.type == 18: # 3D Point
            reader.read_attribute("last_value_x", 8, float)
            reader.read_attribute("last_value_y", 8, float)
            reader.read_attribute("last_value_z", 8, float)
            reader.value.last_value = NVector(
                reader.value.last_value_x,
                reader.value.last_value_y,
                reader.value.last_value_z
            ) * 512
            reader.read_attribute("", 8, float)
            reader.read_attribute("", 8, float)

        reader.finalize()
        return reader.value

    def read_btdk(self, length):
        parser = CosParser(self.file, length)
        return parser.parse()

    def read_nmhd(self, length):
        reader = StructuredReader(self, length)
        reader.skip(3)
        reader.read_attribute("attrs", 1, bytes)
        reader.skip(4)
        reader.read_attribute("duration_num", 4, sint)
        reader.read_attribute("duration_den", 4, int)
        reader.fraction("duration")
        reader.read_attribute("color", 1, int)
        reader.finalize()

        reader.attr_bit("protected", 0, 1)
        return reader.value

    def read_mkif(self, length):
        reader = StructuredReader(self, length)
        reader.read_attribute("inverted", 1, int)
        reader.read_attribute("locked", 1, int)
        reader.skip(4)
        reader.read_attribute("mode", 2, int)
        reader.finalize()
        return reader.value

    def read_ctyp(self, length):
        data = self.read_number(length)
        self.essential_type = EssentialType(data)
        return data

    def read_stvs(self, length):
        reader = StructuredReader(self, length)
        reader.read_attribute("count", 1, int)
        reader.finalize()
        return reader.value

    def read_essential_value(self, length):
        reader = StructuredReader(self, length)

        if self.essential_type == EssentialType.Scalar:
            reader.read_attribute("value", 8, float)
        elif self.essential_type == EssentialType.Color:
            reader.read_attribute_array("value", 4, 4, float)
        elif self.essential_type == EssentialType.Position:
            reader.read_attribute_array("value", 2, 8, float)
        elif self.essential_type == EssentialType.MultiDimensional:
            reader.read_attribute_array("value", 4, 8, float)
        elif self.essential_type == EssentialType.Enum:
            reader.read_attribute("value", 4, int)
        else:
            return self.read(length)

        reader.finalize()
        return reader.value.value

    def read_fips(self, length):
        reader = StructuredReader(self, length)
        reader.skip(12)
        reader.skip(3)
        reader.read_attribute("attrs", 1, bytes)
        reader.attr_bit("alpha_grid", 0, 7)
        reader.finalize()
        return reader.value

    def read_ae_version(self, reader: StructuredReader):
        reader.read_attribute("version_bits", 4, bytes)
        # See https://github.com/tinogithub/aftereffects-version-check/blob/main/images/byte-scheme.PNG
        value = self.endian.decode(reader.value.version_bits)
        # bits 0-7 build
        reader.value.version_build = value & 0xff
        value >>= 8
        # bit 8 ?
        value >>= 1
        # bit 9 beta
        reader.value.version_beta = value & 1
        value >>= 1
        # bit 10 ?
        value >>= 1
        # bit 11-14 patch
        reader.value.version_patch = value & 0xf
        value >>= 4
        # bit 15-18 minor
        reader.value.version_minor = value & 0xf
        value >>= 4
        # bit 19-21 major low bits
        major_low = value & 0x7
        value >>= 3
        # bit 22-25 os
        reader.value.version_os = value & 0xf
        value >>= 4
        if reader.value.version_os == 0b1110:
            os_string = "Mac Arm 64"
        elif reader.value.version_os == 0b1100:
            os_string = "Win"
        elif reader.value.version_os == 0b1101:
            os_string = "Mac"
        else:
            os_string = "Unknown"
        reader.value.version_os_name = os_string
        # bit 26-30 major high bits
        major_high = (value & 0x1f) << 3
        value >>= 6
        reader.value.version_major = major_high | major_low
        reader.value.version = "%s.%s.%s" % (
            reader.value.version_major,
            reader.value.version_minor,
            reader.value.version_patch,
        )
        reader.value.version_full = "v%s%s (%s) (Build %s)" % (
            reader.value.version,
            " BETA" if reader.value.version_beta else "",
            os_string,
            reader.value.version_build,
        )

    def read_svap(self, length):
        reader = StructuredReader(self, length)
        self.read_ae_version(reader)
        reader.finalize()
        return reader.value

    def read_head(self, length):
        reader = StructuredReader(self, length)
        reader.skip(4)
        self.read_ae_version(reader)
        reader.finalize()
        return reader.value
