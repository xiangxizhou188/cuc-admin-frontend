"use client";
import {Component,type ReactNode} from "react";
export class RecoveryBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<main className="page"><section role="alert"><h1>Something went wrong</h1><p>Please try again.</p><button onClick={()=>window.location.reload()}>Try again</button></section></main>:this.props.children}
}
