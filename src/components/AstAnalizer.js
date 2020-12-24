const parse    = require('@babel/parser').parse;

const et = { // expressionType
    var     : 'Identifier',
    text    : 'StringLiteral',
    num     : 'NumericLiteral',
    bool    : 'BooleanLiteral',
    arr     : 'ArrayExpression',
    bin     : 'BinaryExpression',
    logic   : 'LogicalExpression',
    ass     : 'AssignmentExpression',
};

class AstAnalyzer {

    constructor() {
        this.tree     = null;
        this.code     = null;
        this.loopId   = 0;
        this.branchId = 0;
        this.blocks   = [];
        this.links    = [];
    }

    parseCode() {
        const ast = parse(this.code);
        this.tree = ast;
    }

    analyze(code) {
        this.code = code;
        this.parseCode();
        this.createDDG();
    }

    parseArr(node, arrPart) {
        let arrValue = '';
        node.elements.forEach(el => {
            if (el.type === et.var) {
                arrValue += `${ el.name },`;
                arrPart.dependency.push(el.name);
            }
            if (el.type === et.num  ||
                el.type === et.bool ||
                el.type === et.text
            ) {
                arrValue += `${ el.value },`;
            }
            if (el.type === et.arr) {
                this.parseArr(el, arrPart);
                arrValue += `${ arrPart.value },`;
            }
        });
        arrPart.value = '[' + arrValue + ']';
    }

    parseVariableDeclaration(node) {
        const declaraion = node.declarations[0];

        let  initPart = { value       : '0',
                          self        :  [],
                          dependency  :  [] };

        if (declaraion.init) {
            if (declaraion.init.type === et.var) {
                initPart.value = declaraion.init.name;
                initPart.dependency.push(declaraion.init.name);
            }
            if (declaraion.init.type === et.num  ||
                declaraion.init.type === et.text ||
                declaraion.init.type === et.bool) {
                initPart.value = declaraion.init.value;
            }
            if (declaraion.init.type === et.arr) {
                this.parseArr(declaraion.init, initPart);
            }
            if (declaraion.init.type === et.bin ||
                declaraion.init.type === et.logic) {
                initPart.value = '';
                this.parseBinaryExpression(declaraion.init, initPart);
            }
        }

        initPart.self.push(declaraion.id.name);

        return [{
            operation  : `${ node.kind } ${ declaraion.id.name } = ${ initPart.value }`,
            dependency : initPart.dependency,
            self       : initPart.self,
            context    : [],
        }];
    }

    parseBinaryExpression(expression, rightPart) {
        if (expression.left.type === et.num  ||
            expression.left.type === et.text ||
            expression.left.type === et.bool
        ) {
            rightPart.value += expression.left.value ;
        }
        if (expression.left.type === et.var) {
            rightPart.value += expression.left.name;
            rightPart.dependency.push(expression.left.name);
        }
        if (expression.left.type === et.bin ||
            expression.left.type === et.logic) {
            this.parseBinaryExpression(expression.left, rightPart);
        }

        if (expression.right.type === et.num  ||
            expression.right.type === et.text ||
            expression.right.type === et.bool
        ) {
            rightPart.value += ` ${ expression.operator } ${ expression.right.value }`;
        }
        if (expression.right.type === et.var) {
            rightPart.value += ` ${ expression.operator } ${ expression.right.name }`;
            rightPart.dependency.push(expression.right.name);
        }
        if (expression.right.type === et.bin ||
            expression.right.type === et.logic) {
            rightPart.value += ` ${ expression.operator } `;
            this.parseBinaryExpression(expression.right, rightPart);
        }
    }

    parseExpressionStatement(expression) {
        let  rightPart = { value       :  '',
                           self        :  [],
                           dependency  :  [] };

        if (expression.right.type === et.bin ||
            expression.right.type === et.logic) {
            this.parseBinaryExpression(expression.right, rightPart);
        }
        if (expression.right.type === et.num  ||
            expression.right.type === et.text ||
            expression.right.type === et.bool
        ) {
            rightPart.value = expression.right.value;
        }
        if (expression.right.type === et.var) {
            rightPart.value = expression.right.name;
            rightPart.dependency.push(expression.right.name);
        }

        if (expression.operator === '=' || expression.operator === '+=' || expression.operator === '-=') {
            rightPart.self.push(expression.left.name);
        }

        return [{
            operation  : `${ expression.left.name } ${ expression.operator } ${ rightPart.value }`,
            dependency : rightPart.dependency,
            self       : rightPart.self,
            context    : [],
        }];
    }

    parseWhile(node) {
        const test = node.test;
        const body = node.body;

        const localLoopId = this.loopId;
        this.loopId++;

        let testPart = { value       :  '',
                         dependency  :  [] };

        this.parseBinaryExpression(test, testPart);

        let nestedElements = [];
        for(const el of body.body) {
            const parseEls = this.parseElement(el);
            parseEls.forEach(item => { item.context.push(`loop_${localLoopId}`); });
            nestedElements = nestedElements.concat(parseEls);
            if(parseEls[0].operation === 'break') { break; }
        }

        return [{
            operation  : `while(${ testPart.value })`,
            dependency : testPart.dependency,
            context    : [],
        }, ...nestedElements];
    }

    parseFor(node) {
        const init   = node.init;
        const test   = node.test;
        const update = node.update;
        const body   = node.body;

        const localLoopId = this.loopId;
        this.loopId++;

        let testPart = { value       :  '',
                         dependency  :  [] };

        const initArr = this.parseVariableDeclaration(init);
        this.parseBinaryExpression(test, testPart);
        let updatetArr = [];
        if (update.type === 'AssignmentExpression') {
            updatetArr = this.parseExpressionStatement(update);
        }
        if (update.type === 'UpdateExpression') {
            updatetArr.push({
                operation  : `${ update.argument.name }${ update.operator }`,
                dependency : [],
                self       : [],
                context    : [],
            });
        }

        let nestedElements = [];
        for(const el of body.body) {
            const parseEls = this.parseElement(el);
            parseEls.forEach(item => { item.context.push(`loop_${localLoopId}`); });
            nestedElements = nestedElements.concat(parseEls);
            if(parseEls[0].operation === 'break') { break; }
        }

        return [{
            operation  : `for(${ initArr[0].operation }; ${ testPart.value }; ${ updatetArr[0].operation })`,
            dependency : [...testPart.dependency, ...initArr[0].dependency, ...updatetArr[0].dependency],
            self       : initArr.self,
            context    : [],
        }, ...nestedElements];
    }

    parseIfStatement(node) {
        const test         = node.test;
        const consequent   = node.consequent;
        const alternate    = node.alternate;

        let testPart = { value       :  '',
                         dependency  :  [] };

        const consequentBranchId = this.branchId;
        this.branchId++;
        const consequentArr = this.parseElement(consequent);
        for(const el of consequentArr) {
            el.context.push(`branch_${consequentBranchId}`);
        }

        let alternateArr = [];
        if (alternate) {
            const alternateBranchId = this.branchId;
            this.branchId++;
            alternateArr  = this.parseElement(alternate);
            for(const el of alternateArr) {
                el.context.push(`branch_${alternateBranchId}`);
            }
        }

        this.parseBinaryExpression(test, testPart);

        return [{
            operation  : `if(${ testPart.value })`,
            dependency : testPart.dependency,
            context    : [],
        }, ...consequentArr, ...alternateArr];
    }

    parseElement(node) {
        if (Array.isArray(node)) {
            return node.reduce((acc, current) => {
                return [...acc, ...this.parseElement(current)];
            }, []);
        }
        if (node.type === 'VariableDeclaration') {
            return this.parseVariableDeclaration(node);
        }
        if (node.type === 'ExpressionStatement') {
            return this.parseExpressionStatement(node.expression);
        }
        if (node.type === 'WhileStatement') {
            return this.parseWhile(node);
        }
        if (node.type === 'ForStatement') {
            return this.parseFor(node);
        }
        if (node.type === 'BlockStatement') {
            return this.parseElement(node.body);
        }
        if (node.type === 'BreakStatement') {
            return [{   operation  : 'break',
                        dependency : [],
                        context    : [],  }];
        }
        if (node.type === 'IfStatement') {
            return this.parseIfStatement(node);
        }
    }

    createDDG() {
        const nodes = this.tree.program.body[0].body.body;
        nodes.forEach(el => { 
            const operations = this.parseElement(el);
            this.blocks = this.blocks.concat(operations);
        });

        const selfArr = this.blocks.reduce((acc, el, id) => {
            return [...acc, {
                id,
                self : el.self,
            }]
        }, []);

        for (let i = 0; i < this.blocks.length; i++) {
            const node = this.blocks[i];
            const partOfSelf = selfArr.slice(0, i-1);

            node.dependency = [...new Set(node.dependency)];

            for (let j = 0; j < node.dependency.length; j++) {
                const el = node.dependency[j];

                const x = partOfSelf.find(x => x.self?.find(y => y === el));

                if (x) {
                    this.links.push({
                        from : i,
                        to   : x.id,
                    });
                }
            }
        }
        console.log(this.links);


        // console.log('================================================');
        // this.blocks.forEach(el => console.log(el));
        console.log('================================================');
        // console.log(this.tree);
        // console.log(this.code);
    }

}

module.exports = AstAnalyzer;