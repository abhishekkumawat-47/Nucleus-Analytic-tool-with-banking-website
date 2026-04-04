with open('api/main.py', 'r') as f:
    lines = f.readlines()

parens = 0
brackets = 0
braces = 0
in_string = False
string_char = None
in_triple = False

for i, line in enumerate(lines, 1):
    j = 0
    while j < len(line):
        ch = line[j]
        
        # Skip comments
        if ch == '#' and not in_string:
            break
            
        # Handle triple quotes
        if j + 2 < len(line) and line[j:j+3] in ('"""', "'''"):
            if not in_string:
                in_string = True
                in_triple = True
                string_char = line[j]
                j += 3
                continue
            elif in_triple and line[j] == string_char:
                in_string = False
                in_triple = False
                j += 3
                continue
        
        # Handle single/double quotes
        if ch in ('"', "'") and not in_string:
            in_string = True
            string_char = ch
        elif ch == string_char and in_string and not in_triple:
            if j == 0 or line[j-1] != '\\':
                in_string = False
        
        if not in_string:
            if ch == '(': parens += 1
            elif ch == ')': parens -= 1
            elif ch == '[': brackets += 1
            elif ch == ']': brackets -= 1
            elif ch == '{': braces += 1
            elif ch == '}': braces -= 1
            
            if parens < 0 or brackets < 0 or braces < 0:
                print(f"Line {i}: UNMATCHED closing bracket/paren")
                print(f"  {line.rstrip()}")
                print(f"  parens={parens}, brackets={brackets}, braces={braces}")
                break
        j += 1

if parens != 0 or brackets != 0 or braces != 0:
    print(f"File ends with: parens={parens}, brackets={brackets}, braces={braces}")
else:
    print("All brackets and parentheses are balanced")
