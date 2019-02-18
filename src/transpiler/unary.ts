import * as ts from "ts-morph";
import { transpileExpression } from ".";
import { TranspilerError, TranspilerErrorType } from "../errors/TranspilerError";
import { TranspilerState } from "../TranspilerState";

function useIIFEforUnaryExpression(
	parent: ts.Node<ts.ts.Node>,
	node: ts.PrefixUnaryExpression | ts.PostfixUnaryExpression,
) {
	return !(
		ts.TypeGuards.isExpressionStatement(parent) ||
		(ts.TypeGuards.isForStatement(parent) && parent.getCondition() !== node)
	);
}

export function transpilePrefixUnaryExpression(state: TranspilerState, node: ts.PrefixUnaryExpression) {
	const parent = node.getParentOrThrow();
	const operand = node.getOperand();

	let expStr: string;
	const statements = new Array<string>();

	const opKind = node.getOperatorToken();
	state.pushIdStack();
	if (
		(opKind === ts.SyntaxKind.PlusPlusToken || opKind === ts.SyntaxKind.MinusMinusToken) &&
		ts.TypeGuards.isPropertyAccessExpression(operand)
	) {
		const expression = operand.getExpression();
		const opExpStr = transpileExpression(state, expression);
		const propertyStr = operand.getName();
		const id = state.getNewId();
		statements.push(`local ${id} = ${opExpStr}`);
		expStr = `${id}.${propertyStr}`;
	} else {
		expStr = transpileExpression(state, operand);
	}

	if (opKind === ts.SyntaxKind.PlusPlusToken) {
		statements.push(`${expStr} = ${expStr} + 1`);
	} else if (opKind === ts.SyntaxKind.MinusMinusToken) {
		statements.push(`${expStr} = ${expStr} - 1`);
	}
	if (statements.length > 0) {
		if (useIIFEforUnaryExpression(parent, node)) {
			state.popIdStack();
			const statementsStr = statements.join("; ");
			return `(function() ${statementsStr}; return ${expStr}; end)()`;
		} else {
			return statements.join("; ");
		}
	} else {
		const tokenKind = node.getOperatorToken();
		if (tokenKind === ts.SyntaxKind.ExclamationToken) {
			return `not ${expStr}`;
		} else if (tokenKind === ts.SyntaxKind.MinusToken) {
			return `-${expStr}`;
		} else {
			/* istanbul ignore next */
			throw new TranspilerError(
				`Bad prefix unary expression! (${tokenKind})`,
				node,
				TranspilerErrorType.BadPrefixUnaryExpression,
			);
		}
	}
}

export function transpilePostfixUnaryExpression(state: TranspilerState, node: ts.PostfixUnaryExpression) {
	const parent = node.getParentOrThrow();
	const operand = node.getOperand();

	let expStr: string;
	const statements = new Array<string>();

	const opKind = node.getOperatorToken();
	state.pushIdStack();
	if (
		(opKind === ts.SyntaxKind.PlusPlusToken || opKind === ts.SyntaxKind.MinusMinusToken) &&
		ts.TypeGuards.isPropertyAccessExpression(operand)
	) {
		const expression = operand.getExpression();
		const opExpStr = transpileExpression(state, expression);
		const propertyStr = operand.getName();
		const id = state.getNewId();
		statements.push(`local ${id} = ${opExpStr}`);
		expStr = `${id}.${propertyStr}`;
	} else {
		expStr = transpileExpression(state, operand);
	}

	if (opKind === ts.SyntaxKind.PlusPlusToken) {
		statements.push(`${expStr} = ${expStr} + 1`);
	} else if (opKind === ts.SyntaxKind.MinusMinusToken) {
		statements.push(`${expStr} = ${expStr} - 1`);
	}
	if (statements.length > 0) {
		if (useIIFEforUnaryExpression(parent, node)) {
			const id = state.getNewId();
			state.popIdStack();
			statements.push(`local ${id} = ${expStr}`);
			const statementsStr = statements.join("; ");
			return `(function() ${statementsStr}; return ${id}; end)()`;
		} else {
			return statements.join("; ");
		}
	} else {
		/* istanbul ignore next */
		throw new TranspilerError(
			`Bad postfix unary expression! (${opKind})`,
			node,
			TranspilerErrorType.BadPostfixUnaryExpression,
		);
	}
}
