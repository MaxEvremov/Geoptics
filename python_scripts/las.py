import lasio
import sys
import json
import numpy as np

def read_in():
    params = sys.stdin.read()
    return json.loads(params)

def main():
    params = read_in()
    l = lasio.LASFile()

    is_multiple = params.get("is_multiple")

    l.add_curve("DEPT", np.asarray(params.get("length")), unit="m")

    if is_multiple:
        for plot in params.get("plots"):
            l.add_curve(plot.get("name"), np.asarray(plot.get("temp")), unit="C")
    else:
        l.well["DATE"].value = params.get("date")
        l.add_curve("TEMP", np.asarray(params.get("temp")), unit="C")

    l.write(sys.stdout, version=2.0, fmt="%10.5g")
    sys.exit(0)

if __name__ == "__main__":
    main()
