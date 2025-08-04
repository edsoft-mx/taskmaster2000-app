#!/bin/bash


grpc_tools_node_protoc  --js_out=import_style=commonjs,binary:. --grpc_out=grpc_js:. -I ~/Projects/Taskmaster2000/server/protos/  taskmaster2000.proto