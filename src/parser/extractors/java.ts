/**
 * Java code extractor
 */

import type Parser from 'tree-sitter';
import { BaseExtractor } from './base.js';
import type { ExtractionResult } from '../types.js';

/**
 * Extractor for Java code
 */
export class JavaExtractor extends BaseExtractor {
  readonly language = 'java';

  getTargetNodeTypes(): string[] {
    return [
      'class_declaration',
      'interface_declaration',
      'enum_declaration',
      'method_declaration',
      'constructor_declaration',
      'field_declaration',
      'annotation_type_declaration',
    ];
  }

  protected extractNode(
    node: Parser.SyntaxNode,
    _filePath: string,
    _content: string
  ): ExtractionResult | null {
    switch (node.type) {
      case 'class_declaration':
        return this.extractClass(node);
      case 'interface_declaration':
        return this.extractInterface(node);
      case 'enum_declaration':
        return this.extractEnum(node);
      case 'method_declaration':
        return this.extractMethod(node);
      case 'constructor_declaration':
        return this.extractConstructor(node);
      case 'field_declaration':
        return this.extractField(node);
      case 'annotation_type_declaration':
        return this.extractAnnotationType(node);
      default:
        return null;
    }
  }

  /**
   * Extract class declaration
   */
  private extractClass(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const name = this.extractName(nameNode);

    // Extract modifiers (public, private, abstract, final, etc.)
    const modifiers = this.extractModifiers(node);

    // Extract superclass and interfaces
    const superclassNode = this.getChildByFieldName(node, 'superclass');
    const superclass = superclassNode ? this.extractName(superclassNode.children[0]) : undefined;

    const interfacesNode = this.getChildByFieldName(node, 'interfaces');
    const interfaces: string[] = [];
    if (interfacesNode) {
      for (const child of interfacesNode.children) {
        if (child.type === 'type_identifier') {
          interfaces.push(child.text);
        }
      }
    }

    // Extract generic type parameters
    const typeParamsNode = this.getChildByFieldName(node, 'type_parameters');
    const typeParameters = typeParamsNode ? typeParamsNode.text : undefined;

    return {
      type: 'class',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        modifiers,
        superclass,
        interfaces,
        typeParameters,
        isAbstract: modifiers.includes('abstract'),
        isFinal: modifiers.includes('final'),
        comments: this.extractComments(node),
      },
    };
  }

  /**
   * Extract interface declaration
   */
  private extractInterface(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const name = this.extractName(nameNode);

    const modifiers = this.extractModifiers(node);

    // Extract extended interfaces
    const extendsNode = this.getChildByFieldName(node, 'extends');
    const extendedInterfaces: string[] = [];
    if (extendsNode) {
      for (const child of extendsNode.children) {
        if (child.type === 'type_identifier') {
          extendedInterfaces.push(child.text);
        }
      }
    }

    const typeParamsNode = this.getChildByFieldName(node, 'type_parameters');
    const typeParameters = typeParamsNode ? typeParamsNode.text : undefined;

    return {
      type: 'interface',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        modifiers,
        extendedInterfaces,
        typeParameters,
        comments: this.extractComments(node),
      },
    };
  }

  /**
   * Extract enum declaration
   */
  private extractEnum(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const name = this.extractName(nameNode);

    const modifiers = this.extractModifiers(node);

    // Extract implemented interfaces
    const interfacesNode = this.getChildByFieldName(node, 'interfaces');
    const interfaces: string[] = [];
    if (interfacesNode) {
      for (const child of interfacesNode.children) {
        if (child.type === 'type_identifier') {
          interfaces.push(child.text);
        }
      }
    }

    return {
      type: 'enum',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        modifiers,
        interfaces,
        comments: this.extractComments(node),
      },
    };
  }

  /**
   * Extract method declaration
   */
  private extractMethod(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const name = this.extractName(nameNode);

    const modifiers = this.extractModifiers(node);

    // Extract parameters
    const parametersNode = this.getChildByFieldName(node, 'parameters');
    const parameters = this.extractJavaParameters(parametersNode);

    // Extract return type
    const typeNode = this.getChildByFieldName(node, 'type');
    const returnType = typeNode ? typeNode.text : 'void';

    // Extract type parameters (for generic methods)
    const typeParamsNode = this.getChildByFieldName(node, 'type_parameters');
    const typeParameters = typeParamsNode ? typeParamsNode.text : undefined;

    // Extract throws clause
    const throwsNode = node.children.find(child => child.type === 'throws');
    const exceptions: string[] = [];
    if (throwsNode) {
      for (const child of throwsNode.children) {
        if (child.type === 'type_identifier') {
          exceptions.push(child.text);
        }
      }
    }

    const visibility = this.extractVisibility(modifiers);

    return {
      type: 'method',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        modifiers,
        visibility,
        parameters,
        returnType,
        typeParameters,
        exceptions,
        isStatic: modifiers.includes('static'),
        isAbstract: modifiers.includes('abstract'),
        isFinal: modifiers.includes('final'),
        isSynchronized: modifiers.includes('synchronized'),
        comments: this.extractComments(node),
        complexity: this.calculateComplexity(node),
      },
    };
  }

  /**
   * Extract constructor declaration
   */
  private extractConstructor(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const name = this.extractName(nameNode);

    const modifiers = this.extractModifiers(node);

    const parametersNode = this.getChildByFieldName(node, 'parameters');
    const parameters = this.extractJavaParameters(parametersNode);

    // Extract throws clause
    const throwsNode = node.children.find(child => child.type === 'throws');
    const exceptions: string[] = [];
    if (throwsNode) {
      for (const child of throwsNode.children) {
        if (child.type === 'type_identifier') {
          exceptions.push(child.text);
        }
      }
    }

    const visibility = this.extractVisibility(modifiers);

    return {
      type: 'method',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        modifiers,
        visibility,
        parameters,
        returnType: name, // Constructor returns instance of class
        exceptions,
        isConstructor: true,
        comments: this.extractComments(node),
        complexity: this.calculateComplexity(node),
      },
    };
  }

  /**
   * Extract field declaration
   */
  private extractField(node: Parser.SyntaxNode): ExtractionResult | null {
    const modifiers = this.extractModifiers(node);

    // Only extract public/protected fields or static final fields (constants)
    const visibility = this.extractVisibility(modifiers);
    const isConstant = modifiers.includes('static') && modifiers.includes('final');

    if (visibility === 'private' && !isConstant) {
      return null; // Skip private instance fields
    }

    // Extract type
    const typeNode = this.getChildByFieldName(node, 'type');
    const type = typeNode ? typeNode.text : 'unknown';

    // Extract declarator (variable name)
    const declaratorNode = this.getChildrenOfType(node, 'variable_declarator')[0];
    if (!declaratorNode) return null;

    const nameNode = this.getChildByFieldName(declaratorNode, 'name');
    const name = this.extractName(nameNode);

    return {
      type: isConstant ? 'constant' : 'variable',
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        modifiers,
        visibility,
        fieldType: type,
        isStatic: modifiers.includes('static'),
        isFinal: modifiers.includes('final'),
        comments: this.extractComments(node),
      },
    };
  }

  /**
   * Extract annotation type declaration
   */
  private extractAnnotationType(node: Parser.SyntaxNode): ExtractionResult | null {
    const nameNode = this.getChildByFieldName(node, 'name');
    const name = this.extractName(nameNode);

    const modifiers = this.extractModifiers(node);

    return {
      type: 'interface',
      name: `@${name}`,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      text: this.getNodeText(node),
      metadata: {
        modifiers,
        isAnnotation: true,
        comments: this.extractComments(node),
      },
    };
  }

  /**
   * Extract modifiers (public, private, static, final, etc.)
   */
  private extractModifiers(node: Parser.SyntaxNode): string[] {
    const modifiers: string[] = [];
    for (const child of node.children) {
      if (child.type === 'modifiers') {
        for (const modifier of child.children) {
          modifiers.push(modifier.text);
        }
      }
    }
    return modifiers;
  }

  /**
   * Extract visibility from modifiers
   */
  private extractVisibility(modifiers: string[]): 'public' | 'private' | 'protected' | 'package' {
    if (modifiers.includes('public')) return 'public';
    if (modifiers.includes('private')) return 'private';
    if (modifiers.includes('protected')) return 'protected';
    return 'package'; // Default package-private
  }

  /**
   * Extract Java method/constructor parameters
   */
  private extractJavaParameters(node: Parser.SyntaxNode | null): string[] {
    if (!node) return [];

    const params: string[] = [];
    for (const child of node.children) {
      if (child.type === 'formal_parameter' || child.type === 'spread_parameter') {
        params.push(child.text);
      }
    }
    return params;
  }

  /**
   * Override complexity calculation for Java
   */
  protected calculateComplexity(node: Parser.SyntaxNode): number {
    let complexity = 1;

    const traverse = (n: Parser.SyntaxNode) => {
      // Java-specific control flow
      if (
        n.type === 'if_statement' ||
        n.type === 'for_statement' ||
        n.type === 'enhanced_for_statement' ||
        n.type === 'while_statement' ||
        n.type === 'do_statement' ||
        n.type === 'switch_expression' ||
        n.type === 'catch_clause' ||
        n.type === 'ternary_expression'
      ) {
        complexity++;
      }

      // Logical operators
      if (n.type === 'binary_expression') {
        const operator = n.children.find(child => child.type === '&&' || child.type === '||');
        if (operator) {
          complexity++;
        }
      }

      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return complexity;
  }
}
