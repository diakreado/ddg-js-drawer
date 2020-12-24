import React, { createRef, useEffect } from "react";
import { DataSet, Network } from 'vis';


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
        <div ref={ appRef } />
    );
};
