#!/bin/bash

docker stop $(docker ps | grep nginx | awk '{ print $1 }')
