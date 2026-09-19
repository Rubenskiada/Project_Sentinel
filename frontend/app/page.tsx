"use client";

import { useState, useRef, useEffect } from "react";

interface StreamMessage {
  type: string;
  status?: string;
  payload?: string;
  timestamp: string;
}

type Phase = "IDLE" | "ANALYZING" | "DETECTED" | "REMEDIATING" | "RECOVERED";

export default function Dashboard() {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [customCommand, setCustomCommand] = useState("Alexa, investigate auth service outage");
  const [activePhase, setActivePhase] = useState<Phase>("IDLE");

  const [systemState, setSystemState] = useState({
    status: "OPERATIONAL",
    latency: "42ms",
    errorRate: "0.01%",
    activeCluster: "us-east-1a",
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const connectStream = async () => {
    setIsStreaming(true);
    try {
      const response = await fetch("http://localhost:3001/mcp/stream", { method: "POST" });
      if (!response.body) throw new Error("Stream unavailable");

      setIsConnected(true);
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value);
        const lines = raw.split("\n\n").filter(Boolean);

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.replace("data: ", ""));
              setMessages((prev) => [...prev, { ...data, timestamp: new Date().toLocaleTimeString() }]);

              if (data.type === "voice_prompt" || data.type === "agent_analysis") {
                setActivePhase("ANALYZING");
                setSystemState({
                  status: "INVESTIGATING",
                  latency: "840ms",
                  errorRate: "5.2%",
                  activeCluster: "us-east-1a",
                });
              } else if (data.type === "incident_detected") {
                setActivePhase("DETECTED");
                setSystemState({
                  status: "DEGRADED",
                  latency: "1,240ms",
                  errorRate: "14.2%",
                  activeCluster: "us-east-1a (Failover)",
                });
                setTimeout(() => setActivePhase("REMEDIATING"), 800);
              } else if (data.type === "remediation") {
                setActivePhase("RECOVERED");
                setSystemState({
                  status: "RECOVERED",
                  latency: "46ms",
                  errorRate: "0.02%",
                  activeCluster: "us-east-1a (Rollback verified)",
                });
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error(err);
      setIsConnected(false);
    } finally {
      setIsStreaming(false);
    }
  };

  const triggerIncident = async (cmd: string) => {
    setIsTriggering(true);
    setMessages([]); // Clear logs for a fresh demo run
    setActivePhase("IDLE");
    try {
      await fetch("http://localhost:3001/api/trigger-incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsTriggering(false);
    }
  };

  const startVoiceCapture = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech recognition is not supported in this browser.");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setCustomCommand(transcript);
      triggerIncident(transcript);
    };
    recognition.start();
  };

  const getStatusBadge = () => {
    switch (systemState.status) {
      case "DEGRADED": return "bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]";
      case "INVESTIGATING": return "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]";
      default: return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-zinc-100 p-4 md:p-8 font-mono selection:bg-indigo-500/30">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header Section */}
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                PROJECT SENTINEL
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                MCP GATEWAY
              </span>
            </div>
            <p className="text-xs text-zinc-500">Autonomous Incident Diagnostic & Remediation Agent</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={connectStream}
              disabled={isStreaming || isConnected}
              className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-all border ${
                isConnected 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                  : "bg-white/5 text-white border-white/10 hover:bg-white/10"
              }`}
            >
              {isConnected ? "Gateway Linked" : "Initialize Connection"}
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.6)]" : "bg-zinc-600"}`} />
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                {isConnected ? "Live" : "Offline"}
              </span>
            </div>
          </div>
        </header>

        {/* Action Bar */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex gap-2 backdrop-blur-sm">
          <input
            type="text"
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            className="flex-1 bg-transparent border-none px-4 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded-lg placeholder:text-zinc-600"
          />
          <button
            onClick={startVoiceCapture}
            disabled={!isConnected || isListening}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
              isListening ? "bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse" : "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10"
            }`}
          >
            {isListening ? "● LISTENING" : "🎙️ PTT"}
          </button>
          <button
            onClick={() => triggerIncident(customCommand)}
            disabled={!isConnected || isTriggering}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
          >
            Dispatch Agent
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visual Dashboard (Left 2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#0a0a0c] border border-white/10 rounded-xl p-4 flex flex-col justify-between h-24 relative overflow-hidden">
                <div className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Service Health</div>
                <div className={`inline-block text-xs font-bold px-2 py-1 rounded border w-fit ${getStatusBadge()}`}>
                  {systemState.status}
                </div>
              </div>
              <div className="bg-[#0a0a0c] border border-white/10 rounded-xl p-4 flex flex-col justify-between h-24 relative overflow-hidden">
                <div className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">p99 Latency</div>
                <div className={`text-2xl font-bold ${activePhase === "ANALYZING" || activePhase === "DETECTED" ? "text-rose-400" : "text-emerald-400"}`}>
                  {systemState.latency}
                </div>
              </div>
              <div className="bg-[#0a0a0c] border border-white/10 rounded-xl p-4 flex flex-col justify-between h-24">
                <div className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Error Rate</div>
                <div className="text-2xl font-bold text-white">{systemState.errorRate}</div>
              </div>
              <div className="bg-[#0a0a0c] border border-white/10 rounded-xl p-4 flex flex-col justify-between h-24">
                <div className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Target Cluster</div>
                <div className="text-xs font-bold text-zinc-300 truncate">{systemState.activeCluster}</div>
              </div>
            </div>

            {/* Diagnostic Visualization Panel */}
            <div className="bg-[#0a0a0c] border border-white/10 rounded-xl overflow-hidden flex flex-col h-[400px]">
              <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Diagnostic Telemetry</span>
                <span className="text-[10px] text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/20">AGENT ACTIVE</span>
              </div>
              
              <div className="p-6 flex-1 flex flex-col justify-center relative">
                {/* State Machine Nodes */}
                <div className="flex justify-between items-center mb-8 relative">
                  <div className="absolute left-0 top-1/2 w-full h-0.5 bg-zinc-800 -z-10 -translate-y-1/2" />
                  {["IDLE", "ANALYZING", "DETECTED", "REMEDIATING", "RECOVERED"].map((phase, idx) => {
                    const phases = ["IDLE", "ANALYZING", "DETECTED", "REMEDIATING", "RECOVERED"];
                    const isPassed = phases.indexOf(activePhase) >= idx;
                    const isCurrent = activePhase === phase;
                    return (
                      <div key={phase} className="flex flex-col items-center gap-2">
                        <div className={`h-4 w-4 rounded-full border-2 transition-all duration-500 ${isCurrent ? "bg-indigo-500 border-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.8)] scale-125" : isPassed ? "bg-emerald-500 border-emerald-400" : "bg-zinc-900 border-zinc-700"}`} />
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isCurrent ? "text-indigo-300" : isPassed ? "text-emerald-400/70" : "text-zinc-600"}`}>{phase}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Dynamic Content Panel (Git Diff or Scanning) */}
                <div className="flex-1 bg-black/50 border border-white/5 rounded-lg p-4 font-mono text-sm relative overflow-hidden flex flex-col justify-center">
                  {activePhase === "IDLE" && (
                    <div className="text-center text-zinc-600 animate-pulse text-xs uppercase tracking-widest">Awaiting MCP Protocol Directive...</div>
                  )}
                  {activePhase === "ANALYZING" && (
                    <div className="space-y-2 text-indigo-300/80 text-xs">
                      <p>&gt; Executing MCP Tool: cloudwatch_query_anomalies()</p>
                      <p>&gt; Scanning AWS/ECS metrics...</p>
                      <p>&gt; Correlating 5xx spikes with recent GitHub PRs...</p>
                    </div>
                  )}
                  {(activePhase === "DETECTED" || activePhase === "REMEDIATING" || activePhase === "RECOVERED") && (
                    <div className="space-y-4 animate-in fade-in duration-500">
                      <div className="text-rose-400 text-xs font-bold bg-rose-500/10 px-3 py-1.5 rounded inline-block border border-rose-500/20">
                        ⚠ Root Cause Isolated: Commit #c8a21f (Auth Middleware)
                      </div>
                      <div className="bg-[#0d1117] border border-zinc-800 rounded p-3 text-xs overflow-x-auto">
                        <div className="text-zinc-500 mb-2 border-b border-zinc-800 pb-1 flex justify-between">
                          <span>src/middleware/auth.ts</span>
                          <span>@@ -124,2 +124,2 @@</span>
                        </div>
                        <div className="text-rose-400 bg-rose-950/30 px-2 py-0.5">- const payload = JSON.parse(req.body ?? "&#123;&#125;");</div>
                        <div className="text-emerald-400 bg-emerald-950/30 px-2 py-0.5">+ const payload = JSON.parse(req.body); <span className="text-zinc-500">// TypeError: Cannot read property 'body'</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Terminal Stream */}
          <div className="bg-[#0a0a0c] border border-white/10 rounded-xl overflow-hidden flex flex-col h-[520px]">
             <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">MCP Event Stream</span>
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                </div>
              </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-xs text-zinc-600 mt-4 text-center">Protocol linked. Awaiting chunks...</div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className="text-xs p-3 bg-white/5 border border-white/5 rounded-lg flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-zinc-500">{msg.timestamp}</span>
                      <span className="font-bold text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded uppercase tracking-wider">{msg.type}</span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed font-mono">{msg.payload || msg.status || "-"}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}