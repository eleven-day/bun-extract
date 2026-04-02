import { describe, expect, test } from "bun:test";
import {
  ExitCode,
  BunKitError,
  InputError,
  AuthError,
  NetworkError,
} from "../../src/errors";

describe("ExitCode", () => {
  test("has correct values", () => {
    expect(ExitCode.Success).toBe(0);
    expect(ExitCode.InputError).toBe(1);
    expect(ExitCode.AuthError).toBe(2);
    expect(ExitCode.NetworkError).toBe(3);
  });
});

describe("BunKitError", () => {
  test("is instanceof Error", () => {
    const err = new BunKitError("test", ExitCode.InputError);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(BunKitError);
  });

  test("preserves message and exitCode", () => {
    const err = new BunKitError("something broke", ExitCode.NetworkError);
    expect(err.message).toBe("something broke");
    expect(err.exitCode).toBe(3);
  });
});

describe("error subclasses", () => {
  test("InputError has exitCode 1", () => {
    expect(new InputError("bad input").exitCode).toBe(1);
  });

  test("AuthError has exitCode 2", () => {
    expect(new AuthError("no key").exitCode).toBe(2);
  });

  test("NetworkError has exitCode 3", () => {
    expect(new NetworkError("timeout").exitCode).toBe(3);
  });

  test("subclasses are instanceof BunKitError", () => {
    expect(new InputError("x")).toBeInstanceOf(BunKitError);
    expect(new AuthError("x")).toBeInstanceOf(BunKitError);
    expect(new NetworkError("x")).toBeInstanceOf(BunKitError);
  });
});
