#!/bin/bash

cd python_scripts
virtualenv venv
source ./venv/bin/activate
pip install -r requirements.txt
deactivate
