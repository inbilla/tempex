import sys
import argparse
from .collector.__main__ import main as collector_main


COMPONENT_HANDLERS = {
    'collector': collector_main,
}


def parse_args(args=None):
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('component', choices=COMPONENT_HANDLERS.keys())

    args = parser.parse_known_args(args)
    return args


def main(args=None):
    args, unknown_args = parse_args(args)
    main_func = COMPONENT_HANDLERS.get(args.component)
    sys.argv[0] = ' '.join(sys.argv[:2])
    main_func(sys.argv[2:])


if __name__ == "__main__":
    main()
