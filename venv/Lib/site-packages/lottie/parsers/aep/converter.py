import os
import enum

from ... import objects
from ...nvector import NVector
from ...utils.color import Color
from .gradient_xml import parse_gradient_xml

try:
    from .expressions import process_expression
    can_convert_expressions = True
except ImportError:
    can_convert_expressions = False
    pass


def convert_value_color(arr):
    return Color(arr[1] / 255, arr[2] / 255, arr[3] / 255, arr[0] / 255)


def shape_with_defaults(cls, **defaults):
    def callback():
        obj = cls()
        for k, v in defaults.items():
            prop = getattr(obj, k)
            if isinstance(prop, objects.properties.AnimatableMixin):
                prop.value = v
            else:
                setattr(obj, k, v)
        return obj

    return callback


class PropertyPolicyMultidim:
    def __init__(self, converter=lambda x: x):
        self.converter = converter

    def static(self, cdat):
        if len(cdat.data.value) == 1:
            return self.converter(NVector(*cdat.data.value))[0]
        else:
            return self.converter(NVector(*cdat.data.value))

    def keyframe(self, keyframe, index):
        return self.converter(NVector(*keyframe.value))


class PropertyPolicyPrepared:
    def __init__(self, values):
        self.values = values

    def static(self, cdat):
        return self.values[0]

    def keyframe(self, keyframe, index):
        return self.values[index]


class Asset:
    def __init__(self, id, name, chunk):
        self.id = id
        self.name = name
        self.chunk = chunk

    def load(self, converter):
        pass

    @property
    def lottie_id(self):
        return "asset_%s" % self.id


class FileAsset(Asset):
    def __init__(self, id, name, chunk, pin):
        super().__init__(id, name, chunk)
        self.filename = pin.find("Als2").data.find("alas").data["fullpath"]
        if not self.name:
            self.name = os.path.basename(self.filename)
        sspc = pin.find("sspc").data
        self.width = sspc.width
        self.height = sspc.height

    def to_lottie(self):
        # TODO use plain FileAsset if not an image
        asset = objects.assets.Image("asset_%s" % self.id)
        asset.width = self.width
        asset.height = self.height
        asset.path = os.path.dirname(self.filename)
        asset.file_name = os.path.basename(self.filename)
        return asset


class SolidAsset(Asset):
    def __init__(self, id, name, chunk, cdta, opti):
        super().__init__(id, name or opti.name, chunk)
        self.color = Color(opti.r, opti.g, opti.b, opti.a)


class Comp(Asset):
    def __init__(self, id, name, chunk, cdta):
        super().__init__(id, name, chunk)
        self.cdta = cdta
        self.name = ""
        self.layers = None
        self.used_assets = set()
        self.markers = []

    @property
    def lottie_id(self):
        return "precomp_%s" % self.id

    @property
    def width(self):
        return self.cdta.width

    @property
    def height(self):
        return self.cdta.height

    @property
    def time_scale(self):
        return self.cdta.time_scale

    @property
    def frame_rate(self):
        return self.cdta.frame_rate

    def to_main(self):
        anim = objects.animation.Animation()
        anim.name = self.name
        anim.width = self.cdta.width
        anim.height = self.cdta.height
        anim.frame_rate = self.cdta.frame_rate
        anim.in_point = self.cdta.start_time * self.cdta.frame_rate
        if self.cdta.end_time_num == -1:
            anim.out_point = self.cdta.comp_duration * self.cdta.frame_rate
        else:
            anim.out_point = self.cdta.end_time * self.cdta.frame_rate
        anim.layers = self.layers
        anim.markers = self.markers

        for asset in self.used_assets:
            anim.assets = [a.to_lottie() for a in self.used_assets]

        return anim

    def to_precomp(self):
        anim = objects.assets.Precomp()
        anim.name = self.name
        anim.id = self.lottie_id
        anim.frame_rate = self.cdta.frame_rate
        anim.layers = self.layers
        return anim

    def load(self, converter):
        if self.layers is None:
            self.layers = []
            converter.load_comp(self)


class ExpressionMode(enum.Enum):
    Ignore = enum.auto()
    AsIs = enum.auto()
    Bodymovin = enum.auto()


class AepConverter:
    placeholder = "-_0_/-"
    shapes = {
        "ADBE Vector Group": objects.shapes.Group,

        "ADBE Vector Shape - Group": objects.shapes.Path,
        "ADBE Vector Shape - Rect": objects.shapes.Rect,
        "ADBE Vector Shape - Star": objects.shapes.Star,
        "ADBE Vector Shape - Ellipse": objects.shapes.Ellipse,

        "ADBE Vector Graphic - Stroke": shape_with_defaults(
            objects.shapes.Stroke,
            width=2,
            color=Color(1, 1, 1),
            line_cap=objects.shapes.LineCap.Butt,
            line_join=objects.shapes.LineJoin.Miter,
            miter_limit=4,
        ),
        "ADBE Vector Graphic - Fill": shape_with_defaults(
            objects.shapes.Fill,
            color=Color(1, 0, 0),
            fill_rule=objects.shapes.FillRule.NonZero,
        ),
        "ADBE Vector Graphic - G-Fill": shape_with_defaults(
            objects.shapes.GradientFill,
            end_point=NVector(100, 0),
            fill_rule=objects.shapes.FillRule.NonZero,
        ),
        "ADBE Vector Graphic - G-Stroke": shape_with_defaults(
            objects.shapes.GradientStroke,
            end_point=NVector(100, 0),
        ),

        "ADBE Vector Filter - Merge": objects.shapes.Merge,
        "ADBE Vector Filter - Offset": objects.shapes.OffsetPath,
        "ADBE Vector Filter - PB": objects.shapes.PuckerBloat,
        "ADBE Vector Filter - Repeater": objects.shapes.Repeater,
        "ADBE Vector Filter - RC": objects.shapes.RoundedCorners,
        "ADBE Vector Filter - Trim": objects.shapes.Trim,
        "ADBE Vector Filter - Twist": objects.shapes.Twist,
        "ADBE Vector Filter - Zigzag": objects.shapes.ZigZag,
    }
    properties = {
        "ADBE Time Remapping": ("time_remapping", None),
        "ADBE Camera Aperture": ("perspective", None),

        "ADBE Vector Shape": ("shape", None),
        "ADBE Vector Shape Direction": ("direction", objects.shapes.ShapeDirection),
        "ADBE Vector Rect Roundness": ("rounded", None),
        "ADBE Vector Rect Size": ("size", None),
        "ADBE Vector Rect Position": ("position", None),
        "ADBE Vector Ellipse Size": ("size", None),
        "ADBE Vector Ellipse Position": ("position", None),

        "ADBE Vector Star Type": ("star_type", objects.shapes.StarType),
        "ADBE Vector Star Points": ("points", None),
        "ADBE Vector Star Position": ("position", None),
        "ADBE Vector Star Inner Radius": ("inner_radius", None),
        "ADBE Vector Star Outer Radius": ("outer_radius", None),
        "ADBE Vector Star Inner Roundess": ("inner_roundness", None),
        "ADBE Vector Star Outer Roundess": ("outer_roundness", None),
        "ADBE Vector Star Rotation": ("rotation", None),

        "ADBE Vector Fill Color": ("color", convert_value_color),

        "ADBE Vector Stroke Color": ("color", convert_value_color),
        "ADBE Vector Stroke Width": ("width", None),
        "ADBE Vector Stroke Miter Limit": ("animated_miter_limit", None),
        "ADBE Vector Stroke Line Cap": ("line_cap", objects.shapes.LineCap),
        "ADBE Vector Stroke Line Join": ("line_join", objects.shapes.LineJoin),

        "ADBE Vector Grad Start Pt": ("start_point", None),
        "ADBE Vector Grad End Pt": ("end_point", None),
        "ADBE Vector Grad Colors": ("colors", None),
        "ADBE Vector Grad Type": ("gradient_type", objects.shapes.GradientType),

        "ADBE Vector Merge Type": ("merge_mode", objects.shapes.MergeMode),

        "ADBE Vector Offset Amount": ("amount", None),
        "ADBE Vector Offset Line Join": ("line_join", objects.shapes.LineJoin),
        "ADBE Vector Offset Miter Limit": ("miter_limit", None),

        "ADBE Vector PuckerBloat Amount": ("amount", None),

        "ADBE Vector Repeater Copies": ("copies", None),
        "ADBE Vector Repeater Offset": ("offset", None),
        "ADBE Vector Repeater Order": ("composite", objects.shapes.Composite),
        "ADBE Vector Repeater Anchor Point": ("anchor_point", None),
        "ADBE Vector Repeater Position": ("position", None),
        "ADBE Vector Repeater Rotation": ("rotation", None),
        "ADBE Vector Repeater Start Opacity": ("start_opacity", lambda v: v * 100),
        "ADBE Vector Repeater End Opacity": ("end_opacity", lambda v: v * 100),
        "ADBE Vector Repeater Scale": ("scale", lambda v: v * 100),

        "ADBE Vector RoundCorner Radius": ("radius", None),

        "ADBE Vector Trim Start": ("start", None),
        "ADBE Vector Trim End": ("end", None),
        "ADBE Vector Trim Offset": ("offset", None),

        "ADBE Vector Twist Angle": ("angle", None),
        "ADBE Vector Twist Center": ("center", None),

        "ADBE Vector Zigzag Size": ("amplitude", None),
        "ADBE Vector Zigzag Detail": ("frequency", None),

        "ADBE Anchor Point": ("anchor_point", None),
        "ADBE Position": ("position", None),
        "ADBE Rotate Z": ("rotation", None),
        "ADBE Opacity": ("opacity", lambda v: v * 100),
        "ADBE Scale": ("scale", lambda v: v * 100),

        "ADBE Vector Anchor Point": ("anchor_point", None),
        "ADBE Vector Position": ("position", None),
        "ADBE Vector Rotation": ("rotation", None),
        "ADBE Vector Group Opacity": ("opacity", None),
        "ADBE Vector Scale": ("scale", None),
    }
    property_groups = {
        "ADBE Camera Options Group": ["", None],
        "ADBE Text Properties": ["data", None],
        "ADBE Effect Parade": ["effects", "load_effects"],
        "ADBE Transform Group": ["transform", None],
        "ADBE Vector Transform Group": ["transform", None],
        "ADBE Vector Stroke Dashes": ["", "load_dashes"],
        "ADBE Text Path Options": ["masked_path", None],
        "ADBE Text More Options": ["more_options", None],
        "ADBE Vector Repeater Transform": ["transform", None],
    }
    effect_value_types = {
        0: objects.effects.EffectValueLayer,
        2: objects.effects.EffectValueSlider,
        3: objects.effects.EffectValueAngle,
        4: objects.effects.EffectValueCheckbox,
        5: objects.effects.EffectValueColor,
        6: objects.effects.EffectValuePoint,
        7: objects.effects.EffectValueDropDown,
        9: objects.effects.EffectNoValue,
        10: objects.effects.EffectValueSlider,
        13: objects.effects.CustomEffect,
        15: objects.effects.EffectNoValue,
        16: objects.effects.EffectValuePoint,
    }
    effect_match_names = {
        "ADBE Tint": objects.effects.TintEffect,
        "ADBE Fill": objects.effects.FillEffect,
        "ADBE Stroke": objects.effects.StrokeEffect,
        "ADBE Tritone": objects.effects.TritoneEffect,
        "ADBE Pro Levels2": objects.effects.ProLevelsEffect,
        "ADBE Drop Shadow": objects.effects.DropShadowEffect,
        "ADBE Radial Wipe": objects.effects.RadialWipeEffect,
        "ADBE Displacement Map": objects.effects.DisplacementMapEffect,
        "ADBE Set Matte3": objects.effects.Matte3Effect,
        "ADBE Gaussian Blur 2": objects.effects.GaussianBlurEffect,
        "ADBE Twirl": objects.effects.TwirlEffect,
        "ADBE MESH WARP": objects.effects.MeshWarpEffect,
        "ADBE Ripple": objects.effects.WavyEffect,
        "ADBE Spherize": objects.effects.SpherizeEffect,
        "ADBE FreePin3": objects.effects.PuppetEffect,
    }

    def __init__(self, expression_mode=ExpressionMode.Ignore):
        self.time_mult = 1
        self.time_offset = 0
        self.assets = {}
        self.comps = {}
        self.layers = {}
        self.effects = {}
        self.expression_mode = expression_mode

    def read_properties(self, object, chunk):
        match_name = None
        for item in chunk.data.children:
            # Match name
            if item.header == "tdmn":
                match_name = item.data
            elif match_name in self.property_groups:
                prop, funcn = self.property_groups[match_name]
                subobj = object if not prop else getattr(object, prop)
                func = self.read_properties if funcn is None else getattr(self, funcn)
                func(subobj, item)
            # Name
            elif item.header == "tdsn" and len(item.data.children) > 0:
                name = item.data.children[0]
                if name.header == "Utf8" and name.data != self.placeholder and name.data:
                    object.name = name.data
            # Shape hidden
            elif item.header == "tdsb":
                if (item.data & 1) == 0:
                    object.hidden = True
            # MultiDimensional property
            elif item.header == "LIST" and item.data.type == "tdbs":
                self.parse_property_multidimensional(object, match_name, item)
            # Shape property
            elif item.header == "LIST" and item.data.type == "om-s":
                self.parse_property_shape(object, match_name, item)
            # Gradient color property
            elif item.header == "LIST" and item.data.type == "GCst":
                self.parse_property_gradient(object, match_name, item)
            # Sub-object
            elif item.header == "LIST" and item.data.type == "tdgp":
                if match_name == "ADBE Vectors Group" or match_name == "ADBE Root Vectors Group":
                    self.read_properties(object, item)
                elif match_name == "ADBE Vector Transform Group" or match_name == "ADBE Transform Group":
                    self.read_properties(object.transform, item)
                elif match_name in self.shapes:
                    child = self.shapes[match_name]()
                    object.add_shape(child)
                    child.match_name = match_name
                    self.read_properties(child, item)

    def parse_property_multidimensional(self, object, match_name, chunk):
        meta = self.properties.get(match_name)
        if not meta:
            return

        prop_name, converter = meta
        policy = PropertyPolicyMultidim()
        if converter is not None:
            policy.converter = converter

        prop = objects.properties.MultiDimensional()
        self.parse_property_tdbs(chunk, prop, policy)

        setattr(object, prop_name, prop)

    def parse_property_tdbs(self, chunk, prop, policy):
        tdb4, static, kf, expr = chunk.data.find_multiple("tdb4", "cdat", "list", "Utf8")

        if static:
            prop.value = policy.static(static)

        if kf:
            self.set_property_keyframes(prop, policy, kf, tdb4)

        if expr:
            if self.expression_mode == ExpressionMode.AsIs:
                prop.expression = expr.data
            elif self.expression_mode == ExpressionMode.Bodymovin:
                prop.expression = process_expression(expr.data)

    def time(self, value):
        return (value + self.time_offset) * self.time_mult

    def set_property_keyframes(self, prop, policy, chunk, tdb4):
        ldat = chunk.data.find("ldat")
        if ldat and hasattr(ldat.data, "keyframes"):
            if len(ldat.data.keyframes) == 0:
                return

            for index, aep_kf in enumerate(ldat.data.keyframes):
                time = self.time(aep_kf.time_num / tdb4.time_den)

                kf = prop.add_keyframe(
                    time,
                    policy.keyframe(aep_kf, index)
                )

                if aep_kf.hold:
                    kf.hold = True
                elif not aep_kf.ease:
                    objects.easing.Linear()(kf)
                else:
                    self.keyframe_ease(policy, aep_kf, kf, ldat.data.keyframes, index, tdb4)

        if len(prop.keyframes) == 1:
            prop.clear_animation(prop.keyframes[0].start)

    def _keyframe_pos_tan(self, length, tan):
        if len(tan) > length:
            tan = tan[:length]
        else:
            tan = tan + ([0] * length - len(tan))
        return NVector(tan)

    def keyframe_ease(self, policy, aep_kf, kf, keyframes, index, tdb4):
        next_i = (index + 1) % len(keyframes)
        next_aep_kf = keyframes[next_i]
        next_value = policy.keyframe(next_aep_kf, next_i)

        if tdb4.position:
            kf.out_tan = self._keyframe_pos_tan(len(kf.value), aep_kf.pos_tan_out)
            kf.in_tan = self._keyframe_pos_tan(len(kf.value), next_aep_kf.pos_tan_in)

        next_time = self.time(next_aep_kf.time)
        duration = next_time - kf.time
        if duration == 0:
            return objects.easing.Linear()(kf)

        in_infl = next_aep_kf.in_influence
        in_speed = next_aep_kf.in_speed
        out_infl = aep_kf.out_influence
        out_speed = aep_kf.out_speed

        if tdb4.position or tdb4.no_value:
            if isinstance(in_infl, list):
                in_infl = in_infl[0]
                in_speed = in_speed[0]
                out_infl = out_infl[0]
                out_speed = out_speed[0]

            if tdb4.no_value:
                curve_length = 1
            else:
                curve_length = objects.bezier.CubicBezierSegment(
                    kf.value, kf.out_tan, kf.in_tan, next_value
                ).length
            average_speed = curve_length / duration
            if curve_length == 0:
                out_bez = out_infl / 100
                in_bez = in_infl / 100
            else:
                out_bez = min(curve_length / (out_speed * duration), out_infl / 100)
                in_bez = min(curve_length / (in_speed * duration), in_infl / 100)

            kf.in_value.x = 1 - in_bez
            kf.out_value.x = out_bez

            # TODO fuzzy compare?
            if average_speed == 0:
                kf.in_value.y = kf.in_value.x
                kf.out_value.y = kf.out_value.x
            else:
                kf.in_value.y = 1 - in_speed / average_speed * in_bez
                kf.out_value.y = kf.out_value.x / average_speed * out_bez

        else:
            in_x = []
            out_x = []
            in_y = []
            out_y = []

            for i in range(tdb4.components):
                in_x.append(1 - in_infl[i] / 100)
                out_x.append(out_infl[i] / 100)

                y_normal = next_value[i] - kf.value[i]
                if tdb4.color:
                    y_normal *= 255

                if abs(y_normal) < 0.0000001:
                    y_normal = 1

                out_bez_y = out_speed[i] * out_infl[i] / 100
                in_bez_y = in_speed[i] * in_infl[i] / 100
                out_y.append(out_bez_y * duration / y_normal)
                in_y.append(1 - in_bez_y * duration / y_normal)

            kf.in_value.x = in_x
            kf.in_value.y = in_y
            kf.out_value.x = out_x
            kf.out_value.y = out_y

    def parse_property_shape(self, object, match_name, chunk):
        meta = self.properties.get(match_name)
        if not meta:
            return

        prop_name = meta[0]

        prop = objects.properties.ShapeProperty()

        policy = PropertyPolicyPrepared([])
        tdbs, omks = chunk.data.find_multiple("tdbs", "omks")

        self.parse_shape_omks(omks, policy)
        self.parse_property_tdbs(tdbs, prop, policy)

        setattr(object, prop_name, prop)

    def parse_shape_omks(self, chunk, policy):
        for item in chunk.data.children:
            if item.header == "LIST" and item.data.type == "shap":
                policy.values.append(self.parse_shape_shap(item))

    def parse_property_gradient(self, object, match_name, chunk):
        meta = self.properties.get(match_name)
        if not meta:
            return

        colors = getattr(object, meta[0])
        prop = colors.colors

        policy = PropertyPolicyPrepared([])
        tdbs, keys = chunk.data.find_multiple("tdbs", "GCky")

        for item in keys.data.children:
            if item.header == "Utf8":
                policy.values.append(parse_gradient_xml(item.data, colors))

        self.parse_property_tdbs(tdbs, prop, policy)

    def parse_shape_shap(self, chunk):
        bez = objects.bezier.Bezier()
        shph, list = chunk.data.find_multiple("shph", "list")

        top_left = shph.data.top_left
        bottom_right = shph.data.bottom_right
        bez.closed = not shph.data.open

        points = list.data.find("ldat").data.points
        for i in range(0, len(points), 3):
            vertex = self.absolute_bezier_point(top_left, bottom_right, points[i])
            tan_in = self.absolute_bezier_point(top_left, bottom_right, points[(i-1) % len(points)])
            tan_ou = self.absolute_bezier_point(top_left, bottom_right, points[i+1])
            print(i, vertex, tan_in, tan_ou)
            bez.add_point(vertex, tan_in - vertex, tan_ou - vertex)
        return bez

    def absolute_bezier_point(self, tl, br, p):
        return NVector(
            tl[0] * (1-p.x) + br[0] * p.x,
            tl[1] * (1-p.y) + br[1] * p.y
        )

    def load_dashes(self, stroke, chunk):
        stroke.dashes = []
        mn = None
        for item in chunk.data.children:
            if item.header == "tdmn":
                mn = item.data
            elif item.header == "LIST" and item.data.type == "tdbs":
                dash = objects.shapes.StrokeDash()
                self.parse_property_tdbs(item, dash.length, PropertyPolicyMultidim())
                dash.match_name = mn
                name = mn[len("ADBE Vector Stroke "):].replace(" ", "").lower()
                dash.name = name
                dash.type = objects.shapes.StrokeDashType(name[0])
                stroke.dashes.append(dash)

    def load_effect_values(self, effect, chunk):
        for index, tdbs in enumerate(chunk.data.find_all("tdbs")):
            if index == 0:
                continue
            policy = PropertyPolicyMultidim()
            prop = effect.effects[index-1].value
            self.parse_property_tdbs(tdbs, prop, policy)

    def load_effects(self, layer: objects.layers.VisualLayer, chunk):
        mn = None
        layer.effects = []

        for item in chunk.data.children:
            if item.header == "tdmn":
                mn = item.data
            elif item.header == "LIST" and item.data.type == "sspc":
                effect = self.effects[mn].clone()
                self.load_effect_values(effect, item.data.find("tdgp"))
                layer.effects.append(effect)

    def create_asset_layer(self, ldta):
        asset = self.assets[ldta.source_id]
        if isinstance(asset, Comp):
            layer = objects.layers.PreCompLayer()
            layer.reference_id = asset.lottie_id
            return layer
        elif isinstance(asset, SolidAsset):
            layer = objects.layers.SolidColorLayer()
            layer.color = asset.color
        elif asset.width > 0 and asset.height > 0:
            layer = objects.layers.ImageLayer()
            layer.reference_id = asset.lottie_id
        else:
            layer = objects.layers.AudioLayer()
            layer.reference_id = asset.lottie_id

        layer.width = asset.width
        layer.height = asset.height
        layer.name = asset.name
        return layer

    def chunk_to_layer(self, chunk):
        name = None
        layer = None
        for item in chunk.data.children:
            if item.header == "Utf8":
                if item.data:
                    layer.name = item.data
            elif item.header == "ldta":
                # Asset layer
                if item.data.type == 0:
                    if item.data.null:
                        layer = objects.layers.NullLayer()
                    else:
                        layer = self.create_asset_layer(item)
                # Light Layer
                elif item.data.type == 1:
                    return None
                # Camera Layer
                elif item.data.type == 2:
                    layer = objects.layers.CameraLayer()
                elif item.data.type == 3:
                    layer = objects.layers.TextLayer()
                elif item.data.type == 4:
                    layer = objects.layers.ShapeLayer()

                layer.name = name
                if isinstance(layer, objects.layers.VisualLayer):
                    layer.transform.position.value = NVector(self.anim.width / 2, self.anim.height / 2)
                    if item.data.parent_id:
                        layer.parent_index = item.data.parent_id
                self.time_offset = item.data.start_time
                layer.start_time = self.time_offset * self.time_mult
                layer.in_point = self.time(item.data.in_time)
                layer.out_point = self.time(item.data.out_time)
                layer.threedimensional = item.data.ddd
                layer.hidden = not item.data.visible
                layer.index = item.data.layer_id
                layer.is_guide = item.data.guide
                layer.matte_mode = objects.layers.MatteMode(item.data.matte_mode)

            elif item.header == "LIST":
                self.read_properties(layer, item)

        return layer

    def chunk_to_markerts(self, chunk, comp: Comp):
        mrst = chunk.data.find("tdgp").data.find("mrst").data

        mrky, tdbs = mrst.find_multiple("mrky", "tdbs")

        markers = []

        for item in mrky.data.children:
            if item.header == "LIST" and item.data.type == "Nmrd":
                marker = objects.animation.Marker()
                nmhd, comment = item.data.find_multiple("NmHd", "Utf8")
                marker.duration = nmhd.data.duration * comp.frame_rate
                marker.comment = comment.data
                markers.append(marker)

        for i, kf in enumerate(tdbs.data.find("list").data.find("ldat").data.keyframes):
            markers[i].time = self.time(kf.time)

        comp.markers += markers

    def load_comp(self, comp: Comp):
        self.anim = comp
        self.time_mult = comp.frame_rate
        self.time_offset = 0

        for item in comp.chunk.data.children:
            if item.header == "LIST":
                if item.data.type == "Layr":
                    layer = self.chunk_to_layer(item)
                    if layer:
                        comp.layers.append(layer)
                elif item.data.type == "SecL":
                    self.chunk_to_markerts(item, comp)

        return comp

    def collect_assets(self, fold):
        for chunk in fold.data.children:
            if chunk.header == "LIST" and chunk.data.type == "Item":
                item_data = chunk.data.find("idta").data
                name = chunk.data.find("Utf8").data
                if item_data.type == 1:
                    self.items_from_fold(chunk)
                    return
                elif item_data.type == 4:
                    asset = Comp(item_data.id, name, chunk, chunk.data.find("cdta").data)
                    self.comps[name] = asset
                elif item_data.type == 7:
                    pin = chunk.find("Pin ").data
                    opti = pin.find("opti")

                    if opti.type == "Soli":
                        asset = SolidAsset(item_data.id, name, chunk, opti)
                    else:
                        asset = FileAsset(item_data.id, name, chunk, pin)

                self.assets[asset.id] = asset

    def collect_effects(self, effects):
        for definition in effects.data.find_all("EfDf"):
            match, params = definition.data.find_multiple("tdmn", "sspc")
            if match in self.effects:
                continue

            if match in self.effect_match_names:
                effect = self.effect_match_names()
                effect.name = params.data.find("fnam").data.find("Utf8").data
            else:
                effect = objects.effects.CustomEffect()
                index = 0
                mn = None
                for chunk in params.data.children:
                    if chunk.header == "tdmn":
                        mn = chunk.data
                    elif chunk.header == "fnam":
                        effect.name = chunk.data.find("Utf8").data
                    elif chunk.header == "LIST" and chunk.data.type == "parT":
                        index += 1
                        if index == 1:
                            continue
                        pard = chunk.data.find("pard").data
                        type = pard.value
                        val = self.effect_value_types.get(type, objects.effects.EffectNoValue)()
                        val.match_name = mn
                        val.name = pard.name
                        effect.effects.append(val)

            effect.match_name = match
            self.effects[match] = effect

    def process(self, top_level):
        fold, effects = top_level.data.find_multiple("Fold", "EfdG")
        self.collect_assets(fold)
        if effects:
            self.collect_effects(effects)

    def import_aep(self, top_level, name):
        self.process(top_level)

        if not name:
            comp = next(iter(self.comps.values()))
        else:
            comp = self.comps[name]

        comp.load(self)

        return comp.to_main()
