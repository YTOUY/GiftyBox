from ...nvector import NVector


def xml_value_to_python(element):
    if element.tag == "prop.map":
        return xml_value_to_python(element[0])
    elif element.tag == "prop.list":
        return xml_list_to_dict(element)
    elif element.tag == "array":
        return xml_array_to_list(element)
    elif element.tag == "int":
        return int(element.text)
    elif element.tag == "float":
        return float(element.text)
    elif element.tag == "string":
        return element.text
    else:
        return element


def xml_array_to_list(element):
    data = []
    for ch in element:
        if ch.tag != "array.type":
            data.append(xml_value_to_python(ch))
    return data


def xml_list_to_dict(element):
    data = {}
    for pair in element.findall("prop.pair"):
        key = None
        value = None
        for ch in pair:
            if ch.tag == "key":
                key = ch.text
            else:
                value = xml_value_to_python(ch)
        data[key] = value

    return data


def parse_gradient_xml(gradient, colors_prop):
    flat = []

    data = gradient["Gradient Color Data"]

    previous = None
    count = 0
    for stop in data["Color Stops"]["Stops List"].values():
        colors = stop["Stops Color"]
        if previous is not None:
            offset = previous[0] * (1 - previous[1]) + colors[0] * previous[1]
            count += 1
            flat += [offset, (previous[2] + colors[2]) / 2, (previous[3] + colors[3]) / 2, (previous[4] + colors[4]) / 2]

        count += 1
        flat += [colors[0], colors[2], colors[3], colors[4]]
        previous = colors

    previous = None
    for stop in data["Alpha Stops"]["Stops List"].values():
        alpha = stop["Stops Alpha"]
        if previous is not None:
            offset = previous[0] * (1 - previous[1]) + colors[0] * previous[1]
            flat += [offset, (previous[2] + colors[2])]
        flat += [alpha[0], alpha[2]]

    colors_prop.count = count

    return NVector(*flat)
