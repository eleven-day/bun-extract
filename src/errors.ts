export enum ExitCode {
  Success = 0,
  InputError = 1,
  AuthError = 2,
  NetworkError = 3,
}

export class BunKitError extends Error {
  constructor(
    message: string,
    public readonly exitCode: ExitCode,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "BunKitError";
  }
}

export class InputError extends BunKitError {
  constructor(message: string, cause?: Error) {
    super(message, ExitCode.InputError, cause);
  }
}

export class AuthError extends BunKitError {
  constructor(message: string, cause?: Error) {
    super(message, ExitCode.AuthError, cause);
  }
}

export class NetworkError extends BunKitError {
  constructor(message: string, cause?: Error) {
    super(message, ExitCode.NetworkError, cause);
  }
}
