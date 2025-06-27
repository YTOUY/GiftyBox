import io

from xml.etree import ElementTree

from .base import importer
from ..parsers.baseporter import ExtraOption
from ..parsers.aep.aep_riff import AepParser
from ..parsers.aep.converter import AepConverter, ExpressionMode, can_convert_expressions
from ..parsers.aep.aepx import aepx_to_chunk

opts = [
    ExtraOption("comp", help="Name of the composition to extract", default=None)
]

if can_convert_expressions:
    opts.append(ExtraOption(
        "expressions", help="Export expressions", action="store_true", default=False
    ))


def convert(rifx, comp, expressions):
    conv = AepConverter(ExpressionMode.Bodymovin if expressions else ExpressionMode.Ignore)
    return conv.import_aep(rifx, comp)


@importer("AfterEffect Project", ["aep"], opts, slug="aep")
def import_aep(file, comp=None, expressions=False):
    if isinstance(file, str):
        with open(file, "rb") as fileobj:
            return import_aep(fileobj, comp, expressions)

    parser = AepParser(file)
    return convert(parser.parse(), comp, expressions)


@importer("AfterEffect Project XML", ["aepx"], opts, slug="aepx")
def import_aepx(file, comp=None, expressions=False):
    dom = ElementTree.parse(file)
    parser = AepParser(None)

    rifx = aepx_to_chunk(dom.getroot(), parser)
    return convert(rifx, comp, expressions)
