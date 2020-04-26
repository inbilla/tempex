from .environment import Environment


def main(args=None):
    config = "config.ini"
    environment = Environment(config)
    environment.run()


if __name__ == "__main__":
    main()