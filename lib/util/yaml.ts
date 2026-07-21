import assert from "node:assert";
import fs from "node:fs";

import equals from "fast-deep-equal/es6";
import {parseDocument, stringify, type YAMLError} from "yaml";

// `singleQuote` keeps the quoting style `js-yaml` used, so upgrading does not rewrite quotes
// throughout existing user configs the first time one is saved.
const STRINGIFY_OPTIONS = {singleQuote: true} as const;

export class YAMLFileException extends Error {
    file: string;

    constructor(error: YAMLError, file: string) {
        super(error.message);

        this.name = "YAMLFileException";
        this.cause = error.cause;
        this.stack = error.stack;
        this.file = file;
    }
}

function read(file: string): KeyValue {
    // `parseDocument` collects problems instead of throwing on the first one, and unlike `parse` it also
    // surfaces warnings (e.g. an unresolved `!secret` tag when the value was not quoted). Those must be
    // treated as errors, otherwise the offending value is silently dropped from the resulting config.
    const doc = parseDocument(fs.readFileSync(file, "utf8"), {logLevel: "silent"});
    const error = doc.errors[0] ?? doc.warnings[0];

    if (error) {
        throw new YAMLFileException(error, file);
    }

    const result = doc.toJS();
    assert(result instanceof Object, `The content of ${file} is expected to be an object`);
    return result as KeyValue;
}

function readIfExists(file: string, fallback: KeyValue = {}): KeyValue {
    return fs.existsSync(file) ? read(file) : fallback;
}

function writeIfChanged(file: string, content: KeyValue): void {
    const before = readIfExists(file);

    if (!equals(before, content)) {
        fs.writeFileSync(file, stringify(content, STRINGIFY_OPTIONS));
    }
}

function updateIfChanged(file: string, key: string, value: KeyValue): void {
    const content = read(file);
    if (content[key] !== value) {
        content[key] = value;
        writeIfChanged(file, content);
    }
}

export default {read, readIfExists, updateIfChanged, writeIfChanged};
