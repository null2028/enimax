#!/bin/bash

isBeta=$(jq .isBeta  ./enimax/helper/data.json)

if [ $isBeta == "true" ]; then
  isBeta=true node ./enimax/helper/uploader.js
fi