# import dependencies
import subprocess
import sys

# converts notebook to html and exports to the appropriate directory
def run_nbconvert():
    cmd = [
        "jupyter", "nbconvert",
        "--to", "html",
        "--no-input",
        "--output", "../docs/case_study.html",
        "case_study.ipynb"
    ]
    print("Running nbconvert...")
    result = subprocess.run(cmd, check=True)
    print("nbconvert completed.")

# adds metadata to the exported html
def run_inject_metadata():
    cmd = [sys.executable, "inject_metadata.py"]
    print("Injecting metadata...")
    result = subprocess.run(cmd, check=True)
    print("Metadata injection completed.")

# run the program
if __name__ == "__main__":
    run_nbconvert()
    run_inject_metadata()
    print("Export and metadata injection complete.")