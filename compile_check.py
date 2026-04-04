#!/usr/bin/env python3
import py_compile
import sys

try:
    py_compile.compile('api/main.py', doraise=True)
    print("✓ File compiled successfully")
except py_compile.PyCompileError as e:
    print(f"Error at line {e.exc_value.lineno if hasattr(e.exc_value, 'lineno') else 'unknown'}")
    print(str(e))
    if hasattr(e.exc_value, 'text'):
        print(e.exc_value.text)
