/**
 * Public API of each `ui-*` entry point, read by the TypeScript compiler rather
 * than from story `argTypes`, which describe Storybook controls (props without a
 * control are missing, defaults are absent).
 *
 * Only props declared in the kit are listed: the native surface
 * (`ComponentPropsWithRef<'button'>`) is summed up by the element receiving it.
 * Defaults are read from the destructuring, per the convention in `AGENTS.md`.
 */

import { posix, relative, sep } from 'node:path';

import ts from 'typescript';

import { KIT_ROOT, KIT_SRC, ROOT } from './entries.mjs';

const toPosix = (path) => path.split(sep).join('/');

export function firstParagraph(text) {
  return (text ?? '')
    .split(/\n\s*\n/)[0]
    .replace(/\s+/g, ' ')
    .trim();
}

function createProgram(rootNames) {
  const configPath = ts.findConfigFile(KIT_ROOT, ts.sys.fileExists, 'tsconfig.json');
  const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
  if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  const { options } = ts.parseJsonConfigFileContent(config, ts.sys, KIT_ROOT);
  return ts.createProgram({ rootNames, options });
}

const isKitDeclaration = (declaration) =>
  declaration.getSourceFile().fileName.startsWith(toPosix(KIT_SRC));

/** Unwraps `memo()` / `forwardRef()`. */
function implementation(symbol) {
  const declaration = symbol.valueDeclaration;
  if (!declaration) return null;
  if (ts.isFunctionDeclaration(declaration)) return declaration;
  if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
    let init = declaration.initializer;
    while (ts.isCallExpression(init) && init.arguments[0]) init = init.arguments[0];
    if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return init;
  }
  return null;
}

/** `{ level = 'high', size = 'default' }` → `{ level: "'high'", size: "'default'" }`. */
function destructuredDefaults(fn) {
  const param = fn?.parameters[0];
  const defaults = {};
  if (!param || !ts.isObjectBindingPattern(param.name)) return defaults;
  for (const element of param.name.elements) {
    if (!element.initializer) continue;
    defaults[(element.propertyName ?? element.name).getText()] = element.initializer.getText();
  }
  return defaults;
}

const NATIVE_TAG = /ComponentProps(?:WithRef|WithoutRef)?<\s*'(\w+)'\s*>/;
const NATIVE_INTERFACE = /\b\w*HTMLAttributes<\s*HTML(\w+)Element\s*>/;
const IRREGULAR_TAGS = { Anchor: 'a', UList: 'ul', OList: 'ol', Image: 'img', Paragraph: 'p' };

function matchNative(text) {
  const tag = NATIVE_TAG.exec(text)?.[1];
  if (tag) return tag;
  const element = NATIVE_INTERFACE.exec(text)?.[1];
  return element ? (IRREGULAR_TAGS[element] ?? element.toLowerCase()) : null;
}

/**
 * Follows type references until the native element shows up: props often go
 * through a local alias (`extends UiFieldSharedProps, NativeInputProps`). Only
 * an interface's `extends` clauses are read, since its members may type a
 * secondary prop (`inputProps?: InputHTMLAttributes<…>`).
 */
function nativeElement(typeNode, checker, seen = new Set()) {
  if (!typeNode) return null;
  const direct = matchNative(typeNode.getText());
  if (direct) return direct;

  const references = [];
  const visit = (node) => {
    if (ts.isTypeLiteralNode(node)) return;
    if (ts.isTypeReferenceNode(node)) references.push(node.typeName);
    if (ts.isExpressionWithTypeArguments(node)) references.push(node.expression);
    ts.forEachChild(node, visit);
  };
  visit(typeNode);

  for (const reference of references) {
    let symbol = checker.getSymbolAtLocation(reference);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    for (const declaration of symbol?.declarations ?? []) {
      if (seen.has(declaration) || !isKitDeclaration(declaration)) continue;
      seen.add(declaration);
      const parents = ts.isInterfaceDeclaration(declaration)
        ? (declaration.heritageClauses ?? []).flatMap((clause) => clause.types)
        : ts.isTypeAliasDeclaration(declaration)
          ? [declaration.type]
          : [];
      for (const parent of parents) {
        const found = nativeElement(parent, checker, seen);
        if (found) return found;
      }
    }
  }
  return null;
}

function literalValues(type, checker) {
  const nonNullable = checker.getNonNullableType(type);
  const members = nonNullable.isUnion() ? nonNullable.types : [nonNullable];
  // `boolean` is the union `true | false`: not worth listing.
  if (members.every((m) => m.flags & ts.TypeFlags.BooleanLiteral)) return null;
  const values = [];
  for (const member of members) {
    if (member.isStringLiteral() || member.isNumberLiteral()) values.push(member.value);
    else return null;
  }
  return values.length ? values : null;
}

const oneLine = (text) => text.replace(/\s+/g, ' ').trim();

/**
 * JSDoc of ONE declaration: `getDocumentationComment()` merges all of them, so
 * the kit's `ref` prop would inherit the text of `@types/react`.
 */
function declarationDoc(declaration) {
  return ts
    .getJSDocCommentsAndTags(declaration)
    .filter(ts.isJSDoc)
    .map((doc) => ts.getTextOfJSDocComment(doc.comment) ?? '')
    .join('\n')
    .trim();
}

const MAX_DEFINITION = 300;

/** `*Props` types get no definition: their content is already in `props`. */
function readType(name, symbol) {
  const declaration = symbol.declarations?.find(isKitDeclaration);
  const entry = { name };
  if (!declaration) return entry;

  const description = firstParagraph(declarationDoc(declaration));
  if (description) entry.description = description;
  if (name.endsWith('Props')) return entry;

  let definition = null;
  if (ts.isTypeAliasDeclaration(declaration)) {
    definition = declaration.type.getText();
  } else if (ts.isInterfaceDeclaration(declaration)) {
    const parents = (declaration.heritageClauses ?? []).flatMap((c) => c.types);
    const members = declaration.members.map((m) => m.getText().replace(/;$/, ''));
    definition =
      (parents.length ? `extends ${parents.map((p) => p.getText()).join(', ')} ` : '') +
      `{ ${members.join('; ')} }`;
  }
  if (definition && oneLine(definition).length <= MAX_DEFINITION) {
    entry.definition = oneLine(definition);
  }
  return entry;
}

function readProps(symbol, checker) {
  const fn = implementation(symbol);
  const signature = checker
    .getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration)
    .getCallSignatures()[0];
  const propsSymbol = signature?.getParameters()[0];
  if (!propsSymbol) return { props: [], native: null };

  const propsType = checker.getTypeOfSymbolAtLocation(propsSymbol, propsSymbol.valueDeclaration);
  const defaults = destructuredDefaults(fn);
  const props = [];
  let forwardsNative = false;

  for (const prop of checker.getPropertiesOfType(propsType)) {
    const declaration = (prop.declarations ?? []).find(isKitDeclaration);
    if (!declaration) {
      forwardsNative = true;
      continue;
    }
    const type = checker.getTypeOfSymbolAtLocation(prop, declaration);
    const entry = {
      name: prop.getName(),
      type: oneLine(declaration.type?.getText() ?? checker.typeToString(type)),
      required: !(prop.flags & ts.SymbolFlags.Optional),
    };
    const values = literalValues(type, checker);
    if (values) entry.values = values;
    if (defaults[entry.name] !== undefined) entry.default = defaults[entry.name];
    const description = declarationDoc(declaration);
    if (description) entry.description = description;
    if (ts.getJSDocDeprecatedTag(declaration)) entry.deprecated = true;
    props.push(entry);
  }

  const typeNode = fn?.parameters[0]?.type;
  const native = forwardsNative ? (nativeElement(typeNode, checker) ?? true) : null;
  return { props, native };
}

/**
 * @param {{ name: string, absEntry: string }[]} components  `collectComponents()`
 * @returns {Record<string, {
 *   components: { name: string, description: string, native: string | true | null, props: object[] }[],
 *   hooks: { name: string, description: string }[],
 *   values: { name: string, description: string }[],
 *   types: { name: string, description?: string, definition?: string }[],
 * }>}
 */
export function extractComponentApi(components) {
  const program = createProgram(components.map((c) => c.absEntry));
  const checker = program.getTypeChecker();
  const api = {};

  for (const component of components) {
    const sourceFile = program.getSourceFile(component.absEntry);
    const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) {
      throw new Error(`Point d'entrée illisible : ${toPosix(relative(ROOT, component.absEntry))}`);
    }

    const entry = { components: [], hooks: [], values: [], types: [] };
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const symbol =
        exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      const name = exported.getName();

      if (!(symbol.flags & ts.SymbolFlags.Value)) {
        entry.types.push(readType(name, symbol));
        continue;
      }
      const description = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
      if (/^use[A-Z]/.test(name)) {
        entry.hooks.push({ name, description: firstParagraph(description) });
      } else if (/^Ui[A-Z]/.test(name) && implementation(symbol)) {
        entry.components.push({ name, description, ...readProps(symbol, checker) });
      } else {
        entry.values.push({ name, description: firstParagraph(description) });
      }
    }

    if (entry.components.length === 0) {
      throw new Error(
        `${component.name} n'exporte aucun composant \`Ui*\` : ` +
          `${posix.join('packages/ui-kit-react', component.entryFile)}`,
      );
    }
    api[component.name] = entry;
  }

  return api;
}
