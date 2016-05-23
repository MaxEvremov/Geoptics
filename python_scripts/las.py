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

    l.well["DATE"].value = params.get("date")
    l.add_curve("DEPT", np.asarray(params.get("length")), unit="m")
    l.add_curve("TEMP", np.asarray(params.get("temp")), unit="C")

    l.write(sys.stdout, version=2.0, fmt="%10.5g")

if __name__ == "__main__":
    main()
