"""
project_overview.py
utility -> universal structure overview script
"""
import os
from collections import defaultdict
from pathlib import Path
import subprocess

# -----------------------------
# CONFIG
# -----------------------------
INCLUDE_EXCLUDED = False  # toggle for including ignored files (False = only tracked by Git)

# edit these to ignore specific folders or files
IGNORE = {
    "folders": {
        "__pycache__",
        ".git",
        "node_modules",
        ".venv", 
        "venv",
        "env",
        ".idea",
        ".vscode",
        ".mypy_cache",
        ".pytest_cache",
        "dist",
        "build",
        "egg-info",
        "general",
        "arc",
        "0.general",
    },
    "files": {
        ".DS_Store",
        "Thumbs.db",
        ".env",
        ".env.local",
        ".env.prod",
    },
    "extensions": {
        ".pyc",
        ".pyo",
        ".exe",
        ".dll",
        ".so",
        ".class",
    },
}

# -----------------------------
# LINE COUNT CATEGORIES
# -----------------------------
CATEGORY_MAP = {
    "Docs": {".md", ".txt", ".doc", ".docx", ".rst", ".log", ".csv", ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg"},
    "Frontend": {".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte", ".html", ".htm", ".css", ".scss", ".sass", ".less"},
    "Python": {".py", ".pyw", ".pyi"},
}

# -----------------------------
# GET PROJECT FILES FROM GIT
# -----------------------------
def get_git_files():
    cmd = ["git", "ls-files"]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, text=True)
    files = result.stdout.splitlines()
    return files

# -----------------------------
# FILTER FILES
# -----------------------------
def should_ignore(file_path: str) -> bool:
    parts = Path(file_path).parts

    # check if any folder in the path is ignored
    for part in parts[:-1]:
        if part in IGNORE["folders"]:
            return True

    # check filename
    filename = parts[-1]
    if filename in IGNORE["files"]:
        return True

    # check extension
    ext = Path(file_path).suffix
    if ext in IGNORE["extensions"]:
        return True

    return False

all_files = [f for f in get_git_files() if not should_ignore(f)]

# -----------------------------
# BUILD TREE STRUCTURE
# -----------------------------
tree = {}
file_types = defaultdict(int)
file_lines = defaultdict(int)
category_lines = defaultdict(int)
category_files = defaultdict(int)

for file_path in all_files:
    parts = Path(file_path).parts
    current = tree
    for part in parts[:-1]:  # folders
        if part not in current:
            current[part] = {}
        current = current[part]
    # file
    current[parts[-1]] = None

    # file type + lines
    ext = Path(file_path).suffix or "no_ext"
    file_types[ext] += 1
    lines = 0
    try:
        with open(file_path, encoding="utf-8") as f:
            lines = sum(1 for _ in f)
            file_lines[ext] += lines
    except Exception:
        pass  # ignore unreadable files

    # categorize
    matched = False
    for category, extensions in CATEGORY_MAP.items():
        if ext in extensions:
            category_lines[category] += lines
            category_files[category] += 1
            matched = True
            break
    if not matched:
        category_lines["Other"] += lines
        category_files["Other"] += 1

# -----------------------------
# PRINT TREE FUNCTION
# -----------------------------
def print_tree(d, prefix=""):
    for key, value in sorted(d.items()):
        if isinstance(value, dict):
            subfolders = sum(1 for v in value.values() if isinstance(v, dict))
            files = sum(1 for v in value.values() if v is None)
            total_files = sum_files(value)
            print(f"{prefix}{key}/ [subfolders: {subfolders}, files: {files}, total files: {total_files}]")
            print_tree(value, prefix + "    ")
        else:
            print(f"{prefix}{key}")

def sum_files(d):
    count = 0
    for v in d.values():
        if isinstance(v, dict):
            count += sum_files(v)
        else:
            count += 1
    return count

# -----------------------------
# CALCULATE STATS
# -----------------------------
total_files = len(all_files)
total_folders = sum(1 for f in tree if isinstance(tree[f], dict))
total_lines = sum(file_lines.values())

# -----------------------------
# PRINT RESULTS
# -----------------------------
print("\n================= IGNORE CONFIG =================\n")
print(f"Ignored folders   : {', '.join(sorted(IGNORE['folders']))}")
print(f"Ignored files     : {', '.join(sorted(IGNORE['files']))}")
print(f"Ignored extensions: {', '.join(sorted(IGNORE['extensions']))}")

print("\n================= PROJECT TREE =================\n")
print_tree(tree)

print("\n================= PROJECT STATS =================\n")
print(f"Total folders: {total_folders}")
print(f"Total files  : {total_files}")
print(f"Total lines  : {total_lines}\n")

print("File types:")
for ext, count in sorted(file_types.items()):
    lines = file_lines[ext]
    print(f"  {ext:6} -> {count:4} files, {lines:6} lines")

print("\n================= LINES BY CATEGORY =================\n")
for category in ["Docs", "Frontend", "Python", "Other"]:
    if category in category_lines:
        exts = CATEGORY_MAP.get(category, set())
        ext_label = ", ".join(sorted(exts)) if exts else "everything else"
        print(f"  {category:10} -> {category_files[category]:4} files, {category_lines[category]:6} lines  ({ext_label})")

print(f"\n  {'TOTAL':10} -> {total_files:4} files, {total_lines:6} lines")