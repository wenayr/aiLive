import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import ts from 'typescript'

const workspaceDirectory = process.argv[2]
if (!workspaceDirectory) throw new Error('Candidate workspace path is required')
const source = await readFile(resolve(workspaceDirectory, 'src/exchanges.mjs'), 'utf8')
const sourceFile = ts.createSourceFile(
    'src/exchanges.mjs',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
)

assert.equal(sourceFile.parseDiagnostics.length, 0, 'candidate source must parse as JavaScript')
const normalizeQuote = sourceFile.statements.find(function normalize(statement) {
    return ts.isFunctionDeclaration(statement) && statement.name?.text == 'normalizeQuote'
})
assert.ok(normalizeQuote, 'normalizeQuote function is required')
assert.equal(isExported(normalizeQuote), true, 'normalizeQuote must stay exported')
assert.deepEqual(normalizeQuote.parameters.map(parameterName), ['source', 'input'])

const adapters = findAdapters(sourceFile)
for (const exchange of ['binance', 'bybit', 'okx']) {
    const method = adapters.properties.find(function namedAdapter(property) {
        return ts.isMethodDeclaration(property) && propertyName(property.name) == exchange
    })
    assert.ok(method && ts.isMethodDeclaration(method), `${exchange} adapter method is required`)
    assert.deepEqual(method.parameters.map(parameterName), ['input'])
    assert.equal(method.body?.statements.length, 1, `${exchange} adapter must have one statement`)
    const statement = method.body?.statements[0]
    assert.ok(statement && ts.isReturnStatement(statement), `${exchange} adapter must return directly`)
    const call = statement.expression
    assert.ok(call && ts.isCallExpression(call), `${exchange} adapter must return a call`)
    assert.ok(ts.isIdentifier(call.expression) && call.expression.text == 'normalizeQuote',
        `${exchange} adapter must call normalizeQuote`)
    assert.equal(call.arguments.length, 2, `${exchange} normalizeQuote call must have two arguments`)
    assert.ok(ts.isStringLiteral(call.arguments[0]) && call.arguments[0].text == exchange,
        `${exchange} must pass its canonical source name`)
    assert.ok(ts.isIdentifier(call.arguments[1]) && call.arguments[1].text == 'input',
        `${exchange} must pass its input unchanged`)
}

console.log('exchange adapter structural AST contract passed')

function findAdapters(file) {
    for (const statement of file.statements) {
        if (!ts.isVariableStatement(statement) || !isExported(statement)) continue
        for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name) || declaration.name.text != 'adapters') continue
            assert.ok(declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer),
                'adapters must be an object literal')
            return declaration.initializer
        }
    }
    assert.fail('exported adapters object is required')
}

function isExported(node) {
    return node.modifiers?.some(function exportModifier(modifier) {
        return modifier.kind == ts.SyntaxKind.ExportKeyword
    }) == true
}

function parameterName(parameter) {
    assert.ok(ts.isIdentifier(parameter.name), 'adapter parameters must be identifiers')
    return parameter.name.text
}

function propertyName(name) {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text
    return null
}
