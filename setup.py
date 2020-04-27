import os
from setuptools import setup, find_packages

with open(os.path.join('tempex', 'requirements.txt')) as f:
    requirements = f.readlines()

with open(os.path.join('tempex', 'VERSION')) as f:
    version = f.read().strip()

setup(
    name='tempex',
    version=version,
    description='Temperature logging and analysis.',
    packages=find_packages(),
    entry_points={
        'console_scripts': [
            'tempex = tempex.__main__:main',
            'tempexctl = tempex.control.__main__:main',
        ]
    },
    install_requires=requirements,
)