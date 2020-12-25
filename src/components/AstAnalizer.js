import { parse } from '@babel/parser';

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
        this.order    = 0;
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

    parseFunctionDeclaration(node) {
        const functionName = node.id.name;
        const params = node.params;
        const arrParams = params.map(param => param.name);
        return [{
            operation  : `function ${ functionName }(${ arrParams })`,
            dependency : [],
            self       : arrParams,
            context    : [],
            order      : this.order,
        }];
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
            order      : this.order,
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
            if (expression.operator === '+=' || expression.operator === '-=') {
                rightPart.dependency.push(expression.left.name);
                // console.log(rightPart.dependency);
            }
        }
        return [{
            operation  : `${ expression.left.name } ${ expression.operator } ${ rightPart.value }`,
            dependency : rightPart.dependency,
            self       : rightPart.self,
            order      : this.order,
            context    : [],
        }];
    }

    parseWhile(node) {
        const test = node.test;
        const body = node.body;

        const order = this.order;
        this.order++;

        const localLoopId = this.loopId;
        this.loopId++;

        let testPart = { value       :  '',
                         dependency  :  [] };

        this.parseBinaryExpression(test, testPart);

        let nestedElements = [];
        for(const el of body.body) {
            const parseEls = this.parseElement(el);
            parseEls.forEach(item => { item.context.push(`loop_${localLoopId}`); });
            if(parseEls[0].operation === 'break') { this.order--; break; }
            nestedElements = nestedElements.concat(parseEls);
        }

        // this.order--;

        return [{
            operation  : `while(${ testPart.value })`,
            dependency : testPart.dependency,
            context    : [],
            order      : order,
            type       : 'while',
            last       : this.order,
        }, ...nestedElements];
    }

    parseFor(node) {
        const init   = node.init;
        const test   = node.test;
        const update = node.update;
        const body   = node.body;

        const order = this.order;
        this.order++;

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
            let parseEls = this.parseElement(el);
            parseEls.forEach(item => { item.context.push(`loop_${localLoopId}`); });
            if(parseEls[0].operation === 'break') { this.order--; break; }
            nestedElements = nestedElements.concat(parseEls);
        }

        // this.order--;

        return [{
            operation  : `for(${ initArr[0].operation }; ${ testPart.value }; ${ updatetArr[0].operation })`,
            dependency : [...testPart.dependency, ...initArr[0].dependency, ...updatetArr[0].dependency],
            order      : order,
            self       : initArr[0].self,
            context    : [],
            type       : 'for',
            last       : this.order,
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
        // console.log(consequentArr);
        // let consequentArrReturn = false;
        for(const el of consequentArr) {
            el.context.push(`branch_${consequentBranchId}`);
            if (el.return) {
            //     consequentArrReturn = true;
                el.return = false;
            }
        }
        console.log(consequentArr);

        let alternateArr = [];
        if (alternate) {
            const alternateBranchId = this.branchId;
            this.branchId++;
            alternateArr  = this.parseElement(alternate);
            for(const el of alternateArr) {
                el.context.push(`branch_${alternateBranchId}`);
                if (el.return) {
                //     consequentArrReturn = true;
                    el.return = false;
                }
            }
        }

        this.parseBinaryExpression(test, testPart);

        return [{
            operation  : `if(${ testPart.value })`,
            dependency : testPart.dependency,
            context    : [],
            self       : [],
            order      : this.order,
        }, ...consequentArr, ...alternateArr];
    }

    parseReturnStatement(node) {
        let rightPart = { value       :  '',
                          dependency  :  [] };

        if (node.argument) {
            if (node.argument.type === et.var) {
                rightPart.value = node.argument.name;
                rightPart.dependency.push(node.argument.name);
            }
            if (node.argument.type === et.num  ||
                node.argument.type === et.text ||
                node.argument.type === et.bool)
            {
                rightPart.value = node.argument.value;
            }
            if (node.argument.type === et.arr) {
                this.parseArr(node.argument, rightPart);
            }
            if (node.argument.type === et.bin ||
                node.argument.type === et.logic)
            {
                rightPart.value = '';
                this.parseBinaryExpression(node.argument, rightPart);
            }
        }
        return [{
            operation  : `return ${rightPart.value}`,
            return     : true,
            dependency : rightPart.dependency,
            context    : [],
            self       : [],
            order      : this.order,
        }];
    }

    parseElement(node) {
        if (Array.isArray(node)) {
            let resArr = [];
            for (const current of node) {
                const newEl = this.parseElement(current);
                resArr = [...resArr, ...newEl];
                if (newEl[0].operation.match('return')) { break; }
            }
            return resArr;
        }
        if (node.type === 'VariableDeclaration') {
            const res = this.parseVariableDeclaration(node);
            this.order++;
            return res;
        }
        if (node.type === 'ExpressionStatement') {
            const res = this.parseExpressionStatement(node.expression);
            this.order++;
            return res;
        }
        if (node.type === 'WhileStatement') {
            const res = this.parseWhile(node);
            this.order++;
            return res;
        }
        if (node.type === 'ForStatement') {
            const res = this.parseFor(node);
            // console.log('res', res);
            this.order++;
            return res;
        }
        if (node.type === 'BlockStatement') {
            const res = this.parseElement(node.body);
            this.order++;
            return res;
        }
        if (node.type === 'ReturnStatement') {
            const res = this.parseReturnStatement(node);
            console.log(res);
            this.order++;
            return res;
        }
        if (node.type === 'BreakStatement') {
            const res = [{   operation  : 'break',
                             dependency : [],
                             self       : [],
                             context    : [],  }];
            this.order++;
            return res;
        }
        if (node.type === 'IfStatement') {
            const res = this.parseIfStatement(node);
            this.order++;
            return res;
        }
    }

    searceReverseInArray(whereSearch, whatSearch, currentContext, i) {
        // if (whereSearch.length === 2) { console.log('searceReverseInArray', whereSearch, whatSearch, currentContext, i); }
        const uniqTypeArr = [];
        const uniqElArr   = [];
        let numberOfBranch = 0;
        for (let k = whereSearch.length-1; k >= 0; k--) {
            const x = whereSearch[k];
            const result = x.self?.find(y => y === whatSearch);
            if (result) {
                let currentType = '';
                if (x.context.length === 0) {
                    currentType = 'no_contex';
                } else if (x.context[0].match('branch|loop')) {
                    currentType = x.context[0];
                }
                if (!uniqTypeArr.includes(currentType) && numberOfBranch < 2) {
                    if (currentContext && currentContext.match('branch') && currentType.match('branch') && currentContext !== currentType) {
                        continue;
                    }
                    if (uniqTypeArr.length === 1 && currentContext === uniqTypeArr[0]) {
                        continue;
                    }

                    // if (whereSearch.length === 2 && i === 5) { console.log('lol ',uniqTypeArr, currentType); }

                    // if (i === 6 && x.id === 5) { console.log('searceReverseInArray',whereSearch, whatSearch, currentContext, i); }
                    this.links.push({
                        from :  i,
                        to   :  x.id,
                    });
                    if (currentType.match('branch')) {
                        numberOfBranch++;
                    }
                    uniqElArr.push(x.self[0]);
                    uniqTypeArr.push(currentType);
                }
            }
        }
    }

    createDDG() {
        const functionNode = this.tree.program.body[0];
        this.blocks = this.blocks.concat(this.parseFunctionDeclaration(functionNode));
        const nodes = this.tree.program.body[0].body.body;

        for (const el of nodes) {
            const operations = this.parseElement(el);
            this.blocks = this.blocks.concat(operations);
            if (operations.find(x => x.return)) { break; }
        }

        const selfArr = this.blocks.reduce((acc, el, id) => {
            return [...acc, {
                id,
                self    : el.self,
                context : el.context,
                value   : el.operation,
            }];
        }, []);

        const loopInfo = {
            end   : 0,
        }
        let loopArr = [];
        for (let i = 0; i < this.blocks.length; i++) {
            const node = this.blocks[i];

            const partOfSelf = selfArr.slice(0, i);

            if (i > loopInfo.end) {
                loopArr = [];
            }

            if (node.type === 'while' || node.type === 'for') {
                loopInfo.end   = node.last;
                loopArr = selfArr.slice(node.order + 1, node.last + 1);
            }
            console.log(loopArr, loopInfo);
            const context = node.context[0];

            node.dependency = [...new Set(node.dependency)];
            for (let j = 0; j < node.dependency.length; j++) {
                const dependencyElement = node.dependency[j];

                this.searceReverseInArray(partOfSelf, dependencyElement, context, i);
                this.searceReverseInArray(loopArr,   dependencyElement, context, i);
            }
        }
        this.links = this.links.filter((thing, index) => {
            const _thing = JSON.stringify(thing);
            return index === this.links.findIndex(obj => {
                return JSON.stringify(obj) === _thing;
            });
        });

        console.log('================================================');
        // console.log(this.blocks);
        // console.log(this.links);
        console.log('================================================');
    }
}
export default AstAnalyzer;