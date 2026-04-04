import ast
import sys

try:
    with open('api/main.py', 'r') as f:
        ast.parse(f.read())
    print("✓ Compilation successful")
except SyntaxError as e:
    print(f"Line {e.lineno}: {e.msg}")
    if e.text:
        print(f"Text: {e.text.strip()}")
        if e.offset:
            print(" " * (e.offset - 1) + "^")
