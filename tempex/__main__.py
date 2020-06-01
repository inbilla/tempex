import os
import sys
import argparse
from .collector.__main__ import main as collector_main
from .control.__main__ import main as control_main
from .processor.__main__ import main as processor_main
from .version import VERSION


COMPONENT_HANDLERS = {
    'collector': collector_main,
    'control': control_main,
    'processor': processor_main,
}


class PrintVersionAction(argparse.Action):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, nargs=0, **kwargs)

    def __call__(self, *args, **kwargs):
        print("tempex {}".format(VERSION))
        sys.exit(0)


def parse_args(args=None):
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--version', action=PrintVersionAction)
    parser.add_argument('component', choices=COMPONENT_HANDLERS.keys())
    parser.add_argument('-c', '--config', default=os.environ.get('TEMPEX_CONFIG_FILE', 'config.ini'))
    args, unknown = parser.parse_known_args(args)

    # Update the config environment
    os.environ['TEMPEX_CONFIG_FILE'] = os.path.realpath(args.config)
    return args, unknown


def main(args=None):
    args, unknown_args = parse_args(args)
    main_func = COMPONENT_HANDLERS.get(args.component)
    sys.argv[0] = ' '.join(sys.argv[:2])
    sub_args = sys.argv[2:]
    main_func(sub_args)


if __name__ == "__main__":
    main()
