#!/bin/bash
# Remove pypi tensorflow from deepforge-server
source activate deepforge-server
pip uninstall tensorflow -y
conda install tensorflow==1.14 -y

deepforge start --server

