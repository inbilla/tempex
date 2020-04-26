from setuptools import setup, find_packages

with open('requirements.txt') as f:
    requirements = f.readlines()

setup(
    name='tempex',
    version='1.0.0',
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