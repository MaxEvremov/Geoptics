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

    l.add_curve("DEPT", np.asarray(params.get("depth")), unit="m")

    for plot in params.get("plots"):
        l.add_curve(plot.get("name"), np.asarray(plot.get("data")), unit="C")

    l.write(sys.stdout, version=2.0, fmt="%.3f")
    sys.exit(0)

if __name__ == "__main__":
    main()
