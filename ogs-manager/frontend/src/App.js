import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8080";

function App() {
  const [nfs, setNfs] = useState([]);
  const [dbStatus, setDbStatus] = useState("UNKNOWN");
  const [selectedNF, setSelectedNF] = useState(null);
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [theme, setTheme] = useState("light");
  const [ueranStatus, setUeranStatus] = useState({
    gnb: { exists: false, running: false, status: "not_created" },
    ue: { exists: false, running: false, status: "not_created" },
  });

  const loadData = async () => {
    try {
      const nfRes = await axios.get(`${API_BASE}/nf`);
      setNfs(nfRes.data);
    } catch (e) {
      console.error("Error loading NF list:", e);
    }

    try {
      const dbRes = await axios.get(`${API_BASE}/health/db`);
      setDbStatus(dbRes.data.status);
    } catch (e) {
      setDbStatus("FAIL");
    }
  };

  const loadUeranStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/ueransim/status`);
      setUeranStatus(res.data);
    } catch (e) {
      setUeranStatus({
        gnb: { exists: false, running: false, status: "error" },
        ue: { exists: false, running: false, status: "error" },
      });
    }
  };

  const loadLogs = async (name) => {
    setSelectedNF(name);
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/nf/${name}/logs`);
      setLogs(res.data);
    } catch (e) {
      setLogs(`Error loading logs: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const action = async (name, act) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/nf/${name}/${act}`);
      await loadData();
    } catch (e) {
      alert(`Action failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadUeranStatus();

    const interval = setInterval(() => {
      loadData();
      loadUeranStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const total = nfs.length;
  const running = nfs.filter((nf) => nf.running).length;
  const stopped = nfs.filter(
    (nf) => !nf.running && nf.status !== "not_created"
  ).length;
  const notCreated = nfs.filter((nf) => nf.status === "not_created").length;

  const hasWebUI = nfs.some((nf) => nf.name === "ogs-webui");
  const webuiRunning = nfs.some(
    (nf) => nf.name === "ogs-webui" && nf.running
  );

  const isDark = theme === "dark";
  const bgColor = isDark ? "#0f172a" : "#f3f4f6";
  const cardBg = isDark ? "#1f2937" : "#ffffff";
  const textColor = isDark ? "#e5e7eb" : "#111827";
  const subTextColor = isDark ? "#9ca3af" : "#6b7280";
  const borderColor = isDark ? "#374151" : "#e5e7eb";
  const headerBg = isDark ? "#020617" : "#ffffff";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bgColor,
        color: textColor,
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <header
        style={{
          padding: "16px 24px",
          borderBottom: `1px solid ${borderColor}`,
          background: headerBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: "bold",
                fontSize: 18,
              }}
            >
              5G
            </div>
            <h1 style={{ margin: 0, fontSize: 20 }}>
              Open5GS Core Manager
            </h1>
          </div>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: subTextColor,
            }}
          >
            Dashboard • Topology • Core NFs • Subscribers • UE/RAN • Logs
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: subTextColor }}>Theme:</span>
          <button
            onClick={() =>
              setTheme((prev) => (prev === "light" ? "dark" : "light"))
            }
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: `1px solid ${borderColor}`,
              background: isDark ? "#111827" : "#e5e7eb",
              color: textColor,
              cursor: "pointer",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isDark ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>
      </header>

      <main style={{ padding: "16px 24px" }}>
        <nav
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "topology", label: "Topology" },
            { id: "core", label: "Core NFs" },
            { id: "subscribers", label: "Subscribers" },
            { id: "ueran", label: "UE/RAN Config" },
            { id: "logs", label: "Unified Logs" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                background:
                  activeTab === tab.id ? "#2563eb" : "transparent",
                color: activeTab === tab.id ? "#ffffff" : "#2563eb",
                fontWeight: activeTab === tab.id ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {loading && (
          <div
            style={{
              marginBottom: 12,
              fontSize: 12,
              color: subTextColor,
            }}
          >
            Processing...
          </div>
        )}

        {activeTab === "dashboard" && (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              <StatusCard
                title="MongoDB"
                value={dbStatus}
                color={dbStatus === "OK" ? "#22c55e" : "#ef4444"}
                bg={cardBg}
                subTextColor={subTextColor}
              />
              <StatusCard
                title="Core NFs Running"
                value={`${running}/${total}`}
                color={running === total ? "#22c55e" : "#f97316"}
                bg={cardBg}
                subTextColor={subTextColor}
              />
              <StatusCard
                title="Stopped NFs"
                value={stopped}
                color={stopped === 0 ? "#22c55e" : "#ef4444"}
                bg={cardBg}
                subTextColor={subTextColor}
              />
              <StatusCard
                title="Not Created"
                value={notCreated}
                color={notCreated === 0 ? "#9ca3af" : "#6b7280"}
                bg={cardBg}
                subTextColor={subTextColor}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 1.2fr) minmax(0, 1fr)",
                gap: 16,
              }}
            >
              <InfraTopologyCard
                dbStatus={dbStatus}
                nfs={nfs}
                bg={cardBg}
                textColor={textColor}
                subTextColor={subTextColor}
                borderColor={borderColor}
                hasWebUI={hasWebUI}
                webuiRunning={webuiRunning}
              />
              <CompactNFTableCard
                nfs={nfs}
                bg={cardBg}
                textColor={textColor}
                subTextColor={subTextColor}
                borderColor={borderColor}
              />
            </div>
          </div>
        )}

        {activeTab === "topology" && (
          <TopologyPage
            dbStatus={dbStatus}
            nfs={nfs}
            bg={cardBg}
            textColor={textColor}
            subTextColor={subTextColor}
            borderColor={borderColor}
            hasWebUI={hasWebUI}
            webuiRunning={webuiRunning}
            ueranStatus={ueranStatus}
          />
        )}

        {activeTab === "core" && (
          <CoreNFPage
            nfs={nfs}
            dbStatus={dbStatus}
            onAction={action}
            onLogs={loadLogs}
            selectedNF={selectedNF}
            logs={logs}
            bg={cardBg}
            textColor={textColor}
            subTextColor={subTextColor}
            borderColor={borderColor}
          />
        )}

        {activeTab === "subscribers" && (
          <SubscribersPage
            bg={cardBg}
            textColor={textColor}
            subTextColor={subTextColor}
            borderColor={borderColor}
          />
        )}

        {activeTab === "ueran" && (
          <UERANConfigPage
            bg={cardBg}
            textColor={textColor}
            subTextColor={subTextColor}
            borderColor={borderColor}
          />
        )}

        {activeTab === "logs" && (
          <UnifiedLogsPage
            nfs={nfs}
            selectedNF={selectedNF}
            logs={logs}
            onSelectNF={loadLogs}
            bg={cardBg}
            textColor={textColor}
            subTextColor={subTextColor}
            borderColor={borderColor}
          />
        )}
      </main>
    </div>
  );
}


function getTopologyStatus(nfs, dbStatus) {
  const byName = Object.fromEntries(nfs.map((nf) => [nf.name, nf]));
  const isRunning = (name) =>
    byName[name] &&
    byName[name].running &&
    byName[name].status !== "not_created";

  return {
    mongoOk: dbStatus === "OK",
    nrfOk: isRunning("ogs-nrf"),
    udrOk: isRunning("ogs-udr"),
    udmOk: isRunning("ogs-udm"),
    ausfOk: isRunning("ogs-ausf"),
    pcfOk: isRunning("ogs-pcf"),
    nssfOk: isRunning("ogs-nssf"),
    amfOk: isRunning("ogs-amf"),
    smfOk: isRunning("ogs-smf"),
    upfOk: isRunning("ogs-upf"),

    mongo_udr_ok: dbStatus === "OK" && isRunning("ogs-udr"),
    nrf_core_ok:
      isRunning("ogs-nrf") &&
      ["ogs-udr", "ogs-udm", "ogs-ausf", "ogs-pcf", "ogs-nssf"].every(
        isRunning
      ),
    amf_smf_upf_ok:
      isRunning("ogs-amf") && isRunning("ogs-smf") && isRunning("ogs-upf"),
  };
}


function StatusCard({ title, value, color, bg, subTextColor }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: bg,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: subTextColor,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

function InfraTopologyCard({
  dbStatus,
  nfs,
  bg,
  textColor,
  subTextColor,
  borderColor,
  hasWebUI,
  webuiRunning,
}) {
  const coreRunning = nfs.filter(
    (nf) =>
      nf.name !== "ogs-webui" &&
      nf.status !== "not_created" &&
      nf.running
  ).length;

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: bg,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 14 }}>Infra Topology</h3>
        <span style={{ fontSize: 11, color: subTextColor }}>
          Open5GS 4G/5G CUPS Architecture (simplified)
        </span>
      </div>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
        }}
      >
        <TopologyNode
          label="MongoDB"
          subLabel="mongo-open5gs"
          status={dbStatus === "OK" ? "OK" : "FAIL"}
          color={dbStatus === "OK" ? "#22c55e" : "#ef4444"}
        />

        <TopologyArrow dotted />

        <TopologyNode
          label="5G Core NFs"
          subLabel={`Running: ${coreRunning}`}
          status={coreRunning > 0 ? "OK" : "DOWN"}
          color={coreRunning > 0 ? "#2563eb" : "#9ca3af"}
        />

        <TopologyArrow dotted />

        <TopologyNode
          label="WebUI"
          subLabel={hasWebUI ? "ogs-webui" : "not deployed"}
          status={hasWebUI && webuiRunning ? "OK" : "DOWN"}
          color={
            hasWebUI && webuiRunning ? "#f97316" : "#9ca3af"
          }
        />
      </div>
    </div>
  );
}

function CompactNFTableCard({
  nfs,
  bg,
  textColor,
  subTextColor,
  borderColor,
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: bg,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <h3 style={{ margin: 0, fontSize: 14 }}>Core NF Status</h3>
      <p
        style={{
          margin: "4px 0 8px",
          fontSize: 11,
          color: subTextColor,
        }}
      >
        Quick overview of NF containers (NRF, UDR, UDM, AUSF, PCF, NSSF,
        AMF, SMF, UPF, WebUI).
      </p>
      <div
        style={{
          borderRadius: 8,
          border: `1px solid ${borderColor}`,
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
          }}
        >
          <thead>
            <tr
              style={{
                background: "rgba(148,163,184,0.12)",
              }}
            >
              <th style={{ padding: 6, textAlign: "left" }}>NF</th>
              <th style={{ padding: 6, textAlign: "left" }}>Status</th>
              <th style={{ padding: 6, textAlign: "left" }}>Running</th>
              <th style={{ padding: 6, textAlign: "left" }}>Info</th>
            </tr>
          </thead>
          <tbody>
            {nfs.map((nf) => (
              <tr key={nf.name}>
                <td
                  style={{
                    padding: 6,
                    borderTop: `1px solid ${borderColor}`,
                  }}
                >
                  {nf.name}
                </td>
                <td
                  style={{
                    padding: 6,
                    borderTop: `1px solid ${borderColor}`,
                  }}
                >
                  {nf.status}
                </td>
                <td
                  style={{
                    padding: 6,
                    borderTop: `1px solid ${borderColor}`,
                  }}
                >
                  {nf.running ? "Yes" : "No"}
                </td>
                <td
                  style={{
                    padding: 6,
                    borderTop: `1px solid ${borderColor}`,
                  }}
                >
                  {nf.status_text}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function TopologyPage({
  dbStatus,
  nfs,
  bg,
  textColor,
  subTextColor,
  borderColor,
  hasWebUI,
  webuiRunning,
  ueranStatus,
}) {
  const topo = getTopologyStatus(nfs, dbStatus);

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: bg,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16 }}>Network Topology</h2>
      <p
        style={{
          margin: "4px 0 12px",
          fontSize: 12,
          color: subTextColor,
        }}
      >
        Open5GS 5G Core control/user plane topology (NRF, UDR, UDM, AUSF,
        PCF, NSSF, AMF, SMF, UPF, MongoDB, WebUI).
      </p>

      <div
        style={{
          marginTop: 10,
          padding: 12,
          borderRadius: 8,
          border: `1px dashed ${borderColor}`,
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>Control Plane</h3>
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <TopologyNode
            label="MongoDB"
            subLabel="mongo-open5gs"
            status={topo.mongoOk ? "OK" : "FAIL"}
            color={topo.mongoOk ? "#22c55e" : "#ef4444"}
          />
          <TopologyArrow dotted />
          <TopologyNode
            label="UDR"
            subLabel="ogs-udr"
            status={topo.udrOk ? "OK" : "DOWN"}
            color={topo.udrOk ? "#2563eb" : "#9ca3af"}
          />
          <div
            style={{
              fontSize: 10,
              color: topo.mongo_udr_ok ? "#22c55e" : "#ef4444",
            }}
          >
            N8 {topo.mongo_udr_ok ? "OK" : "FAIL"}
          </div>

          <TopologyNode
            label="UDM"
            subLabel="ogs-udm"
            status={topo.udmOk ? "OK" : "DOWN"}
            color={topo.udmOk ? "#2563eb" : "#9ca3af"}
          />
          <TopologyNode
            label="AUSF"
            subLabel="ogs-ausf"
            status={topo.ausfOk ? "OK" : "DOWN"}
            color={topo.ausfOk ? "#2563eb" : "#9ca3af"}
          />
          <TopologyNode
            label="PCF"
            subLabel="ogs-pcf"
            status={topo.pcfOk ? "OK" : "DOWN"}
            color={topo.pcfOk ? "#2563eb" : "#9ca3af"}
          />
          <TopologyNode
            label="NSSF"
            subLabel="ogs-nssf"
            status={topo.nssfOk ? "OK" : "DOWN"}
            color={topo.nssfOk ? "#2563eb" : "#9ca3af"}
          />
        </div>

        <div style={{ marginTop: 12, textAlign: "center" }}>
          <TopologyNode
            label="NRF"
            subLabel="ogs-nrf"
            status={topo.nrfOk ? "OK" : "DOWN"}
            color={topo.nrfOk ? "#22c55e" : "#ef4444"}
          />
          <div
            style={{
              fontSize: 10,
              color: topo.nrf_core_ok ? "#22c55e" : "#f97316",
              marginTop: 4,
            }}
          >
            SBI registrations {topo.nrf_core_ok ? "OK" : "PARTIAL"}
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
          }}
        >
          <TopologyNode
            label="AMF"
            subLabel="ogs-amf"
            status={topo.amfOk ? "OK" : "DOWN"}
            color={topo.amfOk ? "#22c55e" : "#ef4444"}
          />
          <TopologyArrow dotted />
          <TopologyNode
            label="SMF"
            subLabel="ogs-smf"
            status={topo.smfOk ? "OK" : "DOWN"}
            color={topo.smfOk ? "#22c55e" : "#ef4444"}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 8,
          border: `1px dashed ${borderColor}`,
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>User Plane</h3>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
          }}
        >
          <TopologyNode
            label="UPF"
            subLabel="ogs-upf"
            status={topo.upfOk ? "OK" : "DOWN"}
            color={topo.upfOk ? "#22c55e" : "#ef4444"}
          />
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 10,
            textAlign: "center",
            color: topo.amf_smf_upf_ok ? "#22c55e" : "#f97316",
          }}
        >
          N11 / N4 / N3 path {topo.amf_smf_upf_ok ? "OK" : "PARTIAL"}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          borderRadius: 8,
          border: `1px dashed ${borderColor}`,
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>Access & Data</h3>
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <TopologyNode
            label="WebUI"
            subLabel={hasWebUI ? "ogs-webui" : "not deployed"}
            status={hasWebUI && webuiRunning ? "OK" : "DOWN"}
            color={
              hasWebUI && webuiRunning ? "#f97316" : "#9ca3af"
            }
          />
          <TopologyArrow dotted />

          <TopologyNode
            label="UE / RAN"
            subLabel="Simulated (UERANSIM) or real gNB"
            status={
              ueranStatus.gnb.running && ueranStatus.ue.running
                ? "OK"
                : ueranStatus.gnb.exists || ueranStatus.ue.exists
                  ? "DOWN"
                  : "N/A"
            }
            color={
              ueranStatus.gnb.running && ueranStatus.ue.running
                ? "#22c55e"
                : ueranStatus.gnb.exists || ueranStatus.ue.exists
                  ? "#ef4444"
                  : "#6b7280"
            }
          />
          <TopologyArrow dotted />
          <TopologyNode
            label="Internet / N6"
            subLabel="External data network"
            status="N/A"
            color="#6b7280"
          />
        </div>
      </div>
    </div>
  );
}


function CoreNFPage({
  nfs,
  dbStatus,
  onAction,
  onLogs,
  selectedNF,
  logs,
  bg,
  textColor,
  subTextColor,
  borderColor,
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: bg,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16 }}>Core NFs Management</h2>
      <p
        style={{
          margin: "4px 0 12px",
          fontSize: 12,
          color: subTextColor,
        }}
      >
        Start/Stop/Restart Open5GS core network functions and inspect logs.
      </p>
      <p style={{ margin: "4px 0 12px", fontSize: 12 }}>
        MongoDB Status:{" "}
        <b
          style={{
            color: dbStatus === "OK" ? "#22c55e" : "#ef4444",
          }}
        >
          {dbStatus}
        </b>
      </p>

      <div
        style={{
          borderRadius: 8,
          border: `1px solid ${borderColor}`,
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
          }}
        >
          <thead>
            <tr
              style={{
                background: "rgba(148,163,184,0.12)",
              }}
            >
              <th style={{ padding: 6, textAlign: "left" }}>NF</th>
              <th style={{ padding: 6, textAlign: "left" }}>Status</th>
              <th style={{ padding: 6, textAlign: "left" }}>Running</th>
              <th style={{ padding: 6, textAlign: "left" }}>Info</th>
              <th style={{ padding: 6, textAlign: "left" }}>Actions</th>
              <th style={{ padding: 6, textAlign: "left" }}>Logs</th>
            </tr>
          </thead>
          <tbody>
            {nfs.map((nf) => (
              <tr key={nf.name}>
                <td
                  style={{
                    padding: 6,
                    borderTop: `1px solid ${borderColor}`,
                  }}
                >
                  {nf.name}
                </td>
                <td
                  style={{
                    padding: 6,
                    borderTop: `1px solid ${borderColor}`,
                  }}
                >
                  {nf.status}
                </td>
                <td
                  style={{
                    padding: 6,
                    borderTop: `1px solid ${borderColor}`,
                  }}
                >
                  {nf.running ? "Yes" : "No"}
                </td>
                <td
                  style={{
                    padding: 6,
                    borderTop: `1px solid ${borderColor}`,
                  }}
                >
                  {nf.status_text}
                </td>
                <td
                  style={{
                    padding: 6,
                    borderTop: `1px solid ${borderColor}`,
                  }}
                >
                  <button
                    onClick={() => onAction(nf.name, "start")}
                    style={actionButtonStyle("#22c55e")}
                  >
                    Start
                  </button>
                  <button
                    onClick={() => onAction(nf.name, "stop")}
                    style={actionButtonStyle("#ef4444")}
                  >
                    Stop
                  </button>
                  <button
                    onClick={() => onAction(nf.name, "restart")}
                    style={actionButtonStyle("#f97316")}
                  >
                    Restart
                  </button>
                </td>
                <td
                  style={{
                    padding: 6,
                    borderTop: `1px solid ${borderColor}`,
                  }}
                >
                  <button
                    onClick={() => onLogs(nf.name)}
                    style={actionButtonStyle("#2563eb")}
                  >
                    View Logs
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedNF && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>
            Logs: {selectedNF}
          </h3>
          <pre
            style={{
              maxHeight: 400,
              overflow: "auto",
              background: "#020617",
              color: "#22c55e",
              padding: 10,
              borderRadius: 8,
              fontSize: 11,
            }}
          >
            {logs}
          </pre>
        </div>
      )}
    </div>
  );
}

function UnifiedLogsPage({
  nfs,
  selectedNF,
  logs,
  onSelectNF,
  bg,
  textColor,
  subTextColor,
  borderColor,
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)",
        gap: 16,
      }}
    >
      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: bg,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>NF List</h2>
        <p
          style={{
            margin: "4px 0 12px",
            fontSize: 12,
            color: subTextColor,
          }}
        >
          Select an NF to view its logs (NRF, UDR, UDM, AUSF, PCF, NSSF,
          AMF, SMF, UPF, WebUI).
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {nfs.map((nf) => (
            <li
              key={nf.name}
              style={{
                padding: "6px 8px",
                borderRadius: 8,
                border: `1px solid ${borderColor}`,
                marginBottom: 6,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                background:
                  selectedNF === nf.name
                    ? "rgba(37,99,235,0.12)"
                    : "transparent",
              }}
              onClick={() => onSelectNF(nf.name)}
            >
              <div>
                <div style={{ fontSize: 13 }}>{nf.name}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: subTextColor,
                  }}
                >
                  {nf.status} • {nf.running ? "Running" : "Stopped"}
                </div>
              </div>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: nf.running ? "#22c55e" : "#ef4444",
                }}
              />
            </li>
          ))}
        </ul>
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: bg,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>Logs Viewer</h2>
        <p
          style={{
            margin: "4px 0 12px",
            fontSize: 12,
            color: subTextColor,
          }}
        >
          Real-time logs from selected NF container.
        </p>
        {selectedNF ? (
          <pre
            style={{
              maxHeight: 400,
              overflow: "auto",
              background: "#020617",
              color: "#22c55e",
              padding: 10,
              borderRadius: 8,
              fontSize: 11,
            }}
          >
            {logs}
          </pre>
        ) : (
          <div
            style={{
              padding: 20,
              borderRadius: 8,
              border: `1px dashed ${borderColor}`,
              fontSize: 12,
              color: subTextColor,
            }}
          >
            Select an NF from the left panel to view logs.
          </div>
        )}
      </div>
    </div>
  );
}

function SubscribersPage({
  bg,
  textColor,
  subTextColor,
  borderColor,
}) {
  const [subs, setSubs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    imsi: "",
    msisdn: "",
    k: "",
    opc: "",
    dnn: "internet",
    sst: 1,
    sd: "",
  });
  const [error, setError] = React.useState("");

  const loadSubs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE}/subscribers`);
      setSubs(res.data);
    } catch (e) {
      setError(`Failed to load subscribers: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadSubs();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "sst" ? Number(value) : value,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!form.imsi || !form.k || !form.opc) {
        setError("IMSI, K, OPc are required.");
        setLoading(false);
        return;
      }
      await axios.post(`${API_BASE}/subscribers`, form);
      setForm({
        imsi: "",
        msisdn: "",
        k: "",
        opc: "",
        dnn: "internet",
        sst: 1,
        sd: "",
      });
      await loadSubs();
    } catch (e) {
      setError(`Failed to create subscriber: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this subscriber?")) return;
    setLoading(true);
    setError("");
    try {
      await axios.delete(`${API_BASE}/subscribers/${id}`);
      await loadSubs();
    } catch (e) {
      setError(`Failed to delete subscriber: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)",
        gap: 16,
      }}
    >
      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: bg,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>Create Subscriber</h2>
        <p
          style={{
            margin: "4px 0 12px",
            fontSize: 12,
            color: subTextColor,
          }}
        >
          Define UE credentials (IMSI, K, OPc) and data network (DNN,
          slice).
        </p>

        {error && (
          <div
            style={{
              marginBottom: 8,
              padding: 8,
              borderRadius: 8,
              background: "rgba(239,68,68,0.12)",
              color: "#ef4444",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} style={{ fontSize: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <label>IMSI *</label>
            <input
              type="text"
              name="imsi"
              value={form.imsi}
              onChange={handleChange}
              style={inputStyle}
              placeholder="e.g. 001010000000001"
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>MSISDN</label>
            <input
              type="text"
              name="msisdn"
              value={form.msisdn}
              onChange={handleChange}
              style={inputStyle}
              placeholder="optional"
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>K (128-bit key) *</label>
            <input
              type="text"
              name="k"
              value={form.k}
              onChange={handleChange}
              style={inputStyle}
              placeholder="32 hex chars"
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>OPc *</label>
            <input
              type="text"
              name="opc"
              value={form.opc}
              onChange={handleChange}
              style={inputStyle}
              placeholder="32 hex chars"
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>DNN (APN)</label>
            <input
              type="text"
              name="dnn"
              value={form.dnn}
              onChange={handleChange}
              style={inputStyle}
              placeholder="internet"
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>SST (Slice/Service Type)</label>
            <input
              type="number"
              name="sst"
              value={form.sst}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>SD (Slice Differentiator)</label>
            <input
              type="text"
              name="sd"
              value={form.sd}
              onChange={handleChange}
              style={inputStyle}
              placeholder="optional"
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: 8,
              padding: "6px 12px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              background: "#22c55e",
              color: "#ffffff",
            }}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Subscriber"}
          </button>
        </form>
      </div>

      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: bg,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>Subscribers List</h2>
        <p
          style={{
            margin: "4px 0 12px",
            fontSize: 12,
            color: subTextColor,
          }}
        >
          Current UE profiles stored in MongoDB (open5gs.subscribers).
        </p>

        {loading && (
          <div
            style={{
              fontSize: 12,
              color: subTextColor,
              marginBottom: 8,
            }}
          >
            Loading...
          </div>
        )}

        <div
          style={{
            borderRadius: 8,
            border: `1px solid ${borderColor}`,
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <thead>
              <tr
                style={{
                  background: "rgba(148,163,184,0.12)",
                }}
              >
                <th style={{ padding: 6, textAlign: "left" }}>IMSI</th>
                <th style={{ padding: 6, textAlign: "left" }}>DNN</th>
                <th style={{ padding: 6, textAlign: "left" }}>Slice</th>
                <th style={{ padding: 6, textAlign: "left" }}>MSISDN</th>
                <th style={{ padding: 6, textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: 8,
                      textAlign: "center",
                      fontSize: 12,
                      color: subTextColor,
                    }}
                  >
                    No subscribers yet. Create one using the form.
                  </td>
                </tr>
              ) : (
                subs.map((s) => (
                  <tr key={s.id}>
                    <td
                      style={{
                        padding: 6,
                        borderTop: `1px solid ${borderColor}`,
                      }}
                    >
                      {s.imsi}
                    </td>
                    <td
                      style={{
                        padding: 6,
                        borderTop: `1px solid ${borderColor}`,
                      }}
                    >
                      {s.dnn}
                    </td>
                    <td
                      style={{
                        padding: 6,
                        borderTop: `1px solid ${borderColor}`,
                      }}
                    >
                      {s.sst}
                      {s.sd ? ` / ${s.sd}` : ""}
                    </td>
                    <td
                      style={{
                        padding: 6,
                        borderTop: `1px solid ${borderColor}`,
                      }}
                    >
                      {s.msisdn || "-"}
                    </td>
                    <td
                      style={{
                        padding: 6,
                        borderTop: `1px solid ${borderColor}`,
                      }}
                    >
                      <button
                        onClick={() => handleDelete(s.id)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: "none",
                          cursor: "pointer",
                          fontSize: 11,
                          background: "#ef4444",
                          color: "#ffffff",
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UERANConfigPage({
  bg,
  textColor,
  subTextColor,
  borderColor,
}) {
  const [cfg, setCfg] = React.useState({
    mcc: "001",
    mnc: "01",
    tac: 1,
    gnb_id: 1,
    amf_ip: "10.0.0.1",
    amf_port: 38412,
    default_imsi: "",
  });
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const loadCfg = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await axios.get(`${API_BASE}/ueran/config`);
      if (res.data) {
        setCfg({
          mcc: res.data.mcc,
          mnc: res.data.mnc,
          tac: res.data.tac,
          gnb_id: res.data.gnb_id,
          amf_ip: res.data.amf_ip,
          amf_port: res.data.amf_port,
          default_imsi: res.data.default_imsi || "",
        });
      }
    } catch (e) {
      setError(`Failed to load UE/RAN config: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadCfg();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCfg((prev) => ({
      ...prev,
      [name]:
        name === "tac" || name === "gnb_id" || name === "amf_port"
          ? Number(value)
          : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await axios.post(`${API_BASE}/ueran/config`, cfg);
      setMessage("UE/RAN config saved successfully.");
    } catch (e) {
      setError(`Failed to save UE/RAN config: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: bg,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 16 }}>UE / RAN Configuration</h2>
      <p
        style={{
          margin: "4px 0 12px",
          fontSize: 12,
          color: subTextColor,
        }}
      >
        Configure PLMN (MCC/MNC), TAC, gNB ID and AMF endpoint for UE/RAN
        simulators (e.g. UERANSIM).
      </p>

      {loading && (
        <div
          style={{
            fontSize: 12,
            color: subTextColor,
            marginBottom: 8,
          }}
        >
          Processing...
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 8,
            padding: 8,
            borderRadius: 8,
            background: "rgba(239,68,68,0.12)",
            color: "#ef4444",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          style={{
            marginBottom: 8,
            padding: 8,
            borderRadius: 8,
            background: "rgba(34,197,94,0.12)",
            color: "#22c55e",
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSave} style={{ fontSize: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <label>MCC</label>
            <input
              type="text"
              name="mcc"
              value={cfg.mcc}
              onChange={handleChange}
              style={inputStyle}
              placeholder="e.g. 001"
            />
          </div>
          <div>
            <label>MNC</label>
            <input
              type="text"
              name="mnc"
              value={cfg.mnc}
              onChange={handleChange}
              style={inputStyle}
              placeholder="e.g. 01"
            />
          </div>
          <div>
            <label>TAC</label>
            <input
              type="number"
              name="tac"
              value={cfg.tac}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label>gNB ID</label>
            <input
              type="number"
              name="gnb_id"
              value={cfg.gnb_id}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label>AMF IP</label>
            <input
              type="text"
              name="amf_ip"
              value={cfg.amf_ip}
              onChange={handleChange}
              style={inputStyle}
              placeholder="e.g. 10.0.0.5"
            />
          </div>
          <div>
            <label>AMF Port</label>
            <input
              type="number"
              name="amf_port"
              value={cfg.amf_port}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label>Default IMSI (UE)</label>
            <input
              type="text"
              name="default_imsi"
              value={cfg.default_imsi || ""}
              onChange={handleChange}
              style={inputStyle}
              placeholder="optional, e.g. 001010000000001"
            />
          </div>
        </div>

        <button
          type="submit"
          style={{
            marginTop: 12,
            padding: "6px 12px",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            background: "#2563eb",
            color: "#ffffff",
          }}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Configuration"}
        </button>
      </form>
    </div>
  );
}


function TopologyNode({ label, subLabel, status, color }) {
  return (
    <div style={{ textAlign: "center", minWidth: 120 }}>
      <div
        style={{
          padding: 10,
          borderRadius: 12,
          background: "rgba(15,23,42,0.9)",
          color: "#e5e7eb",
          border: `1px solid ${color}`,
          fontSize: 12,
        }}
      >
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 10, marginTop: 4 }}>{subLabel}</div>
        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            color,
          }}
        >
          {status}
        </div>
      </div>
    </div>
  );
}

function TopologyArrow({ dotted }) {
  return (
    <div
      style={{
        fontSize: 20,
        opacity: 0.7,
        margin: "0 8px",
        borderBottom: dotted ? "1px dotted #9ca3af" : "none",
      }}
    >
      ➜
    </div>
  );
}

function actionButtonStyle(color) {
  return {
    padding: "4px 8px",
    marginRight: 4,
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    fontSize: 11,
    background: color,
    color: "#ffffff",
  };
}

const inputStyle = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid #9ca3af",
  fontSize: 12,
  marginTop: 4,
};

export default App;
