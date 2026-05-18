// Minimal JSON Schema validator covering the subset used by the three 034
// contract schemas (oss-manifest, oss-allowlist, attributions). Supports:
// type, required, properties + additionalProperties (boolean), items,
// enum, pattern, minLength, minItems, uniqueItems, $ref to #/$defs/*,
// allOf with if/then constructs whose `if` is a `properties.<k>.const`
// equality check. Returns an array of error strings (empty = valid).

function resolveRef(schema, ref) {
  if (!ref.startsWith('#/')) throw new Error(`unsupported $ref: ${ref}`);
  const parts = ref.slice(2).split('/');
  let node = schema;
  for (const p of parts) {
    if (node == null || typeof node !== 'object') {
      throw new Error(`unresolvable $ref segment "${p}" in ${ref}`);
    }
    node = node[p];
  }
  if (!node) throw new Error(`unresolvable $ref: ${ref}`);
  return node;
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value; // string, number, boolean, object
}

function validateNode(value, sub, root, path, errors) {
  if (sub.$ref) {
    validateNode(value, resolveRef(root, sub.$ref), root, path, errors);
    return;
  }

  if (sub.type !== undefined) {
    const types = Array.isArray(sub.type) ? sub.type : [sub.type];
    const actual = typeOf(value);
    if (!types.includes(actual)) {
      errors.push(`${path}: expected type ${types.join('|')}, got ${actual}`);
      return;
    }
  }

  if (sub.enum !== undefined && !sub.enum.includes(value)) {
    errors.push(`${path}: value ${JSON.stringify(value)} not in enum ${JSON.stringify(sub.enum)}`);
  }
  if (sub.const !== undefined && value !== sub.const) {
    errors.push(
      `${path}: expected const ${JSON.stringify(sub.const)}, got ${JSON.stringify(value)}`
    );
  }

  if (typeof value === 'string') {
    if (sub.minLength !== undefined && value.length < sub.minLength) {
      errors.push(`${path}: minLength ${sub.minLength}, got ${value.length}`);
    }
    if (sub.pattern !== undefined) {
      const re = new RegExp(sub.pattern);
      if (!re.test(value)) errors.push(`${path}: pattern ${sub.pattern} mismatch`);
    }
    if (sub.format === 'uri' && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
      errors.push(`${path}: format uri mismatch`);
    }
  }

  if (Array.isArray(value)) {
    if (sub.minItems !== undefined && value.length < sub.minItems) {
      errors.push(`${path}: minItems ${sub.minItems}, got ${value.length}`);
    }
    if (sub.uniqueItems) {
      const seen = new Set();
      for (const item of value) {
        const k = JSON.stringify(item);
        if (seen.has(k)) errors.push(`${path}: uniqueItems violated for ${k}`);
        seen.add(k);
      }
    }
    if (sub.items) {
      value.forEach((item, i) => validateNode(item, sub.items, root, `${path}[${i}]`, errors));
    }
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    if (Array.isArray(sub.required)) {
      for (const key of sub.required) {
        if (!(key in value)) errors.push(`${path}: missing required "${key}"`);
      }
    }
    if (sub.properties) {
      for (const [k, v] of Object.entries(value)) {
        if (sub.properties[k]) validateNode(v, sub.properties[k], root, `${path}.${k}`, errors);
        else if (sub.additionalProperties === false)
          errors.push(`${path}: unexpected property "${k}"`);
      }
    }
    if (Array.isArray(sub.allOf)) {
      for (const branch of sub.allOf) {
        // Support {if: {properties: {<k>: {const: <v>}}}, then: {required: [...]}}
        if (branch.if && branch.then) {
          const condProps = branch.if.properties || {};
          const matches = Object.entries(condProps).every(([k, expect]) =>
            expect.const !== undefined ? value[k] === expect.const : true
          );
          if (matches) validateNode(value, branch.then, root, path, errors);
        } else {
          validateNode(value, branch, root, path, errors);
        }
      }
    }
  }
}

export function validate(data, schema) {
  const errors = [];
  validateNode(data, schema, schema, '$', errors);
  return errors;
}
