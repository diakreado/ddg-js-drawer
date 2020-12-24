import React, { createRef, useEffect } from "react";
import { DataSet, Network } from 'vis';

// const nodes = new DataSet([
//     { id : 1, label : 'Node 1' },
//     { id : 2, label : 'Node 2' },
//     { id : 3, label : 'Node 3' },
//     { id : 4, label : 'Node 4' },
//     { id : 5, label : 'Node 5' }
// ]);

// create an array with edges
const edges = new DataSet([
    { from : 1, to : 2 },
    { from : 2, to : 3 },
    { from : 3, to : 4 },
    { from : 4, to : 5 },
    { from : 5, to : 6 },
    { from : 6, to : 7 },
]);

const options = {
    edges:{ arrows: { to: { enabled: true, type: "arrow" } } },
    nodes : { size : 50 },
};

function parseGraph(graph) {
    const rawNodes = graph.reduce((acc, node, id) => {
        return [...acc, {
            id,
            label : node.operation,
        }];
    }, []);
    
    return {
        nodes : new DataSet(rawNodes),
    };
}


export default function VisNetwork(props) {
    const appRef  = createRef();

    useEffect(() => {
        const parsResult = parseGraph(props.graph);
        const data = {
            nodes : parsResult.nodes,
            edges : props.links,
        };

        new Network(appRef.current, data, options);
    }, [appRef, props.graph, props.links]);

    return (
        <div style={{ height: '600px' }} ref={ appRef } />
    );
};
