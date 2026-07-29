# ⛏️ Minecraft Server Dashboard

A lightweight desktop script designed to manage, host, and monitor local Minecraft servers effortlessly. Built with Python, Flask, WebSockets, and a web-based dashboard interface.

---

## 🌟 Features

- **Automated Server Setup:** Automatically downloads the required Minecraft server versions (PaperMC, Vanilla, etc.) 
- **Live Interactive Console:** Real-time console streaming and command execution powered by WebSockets (`Socket.IO`).
- **Performance Monitoring:** Real-time RAM and CPU consumption metrics using `psutil`.
- **Mod & Plugin Manager (In Development):** Seamless integration with the **CurseForge API** to search, download, and install server-side mods, modpacks, and plugins directly from the interface.
- **One-Click Public Tunnels:** Seamless public hosting integration with Playit.gg, removing the need for complex port forwarding.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.x, Flask, Flask-SocketIO, `subprocess`, `psutil`
- **Frontend:** HTML5, CSS3, JavaScript (Socket.IO client)
- **External APIs:** PaperMC API, CurseForge API (for mod discovery and updates), Playit.gg CLI

---

## 🚀 Getting Started

### Prerequisites

- Python 3.9+ installed on your system.
- Java 17 or higher (required to run modern Minecraft server builds).

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/tu-usuario/nombre-de-tu-repo.git](https://github.com/tu-usuario/nombre-de-tu-repo.git)
   cd nombre-de-tu-repo
   ```

2. **Install dependencies**
    ```bash
    pip install -r requirements.txt
    ```

3. **Run the application**
    ```bash
    python app.py
    ```

4. Open your browser and navigate to http://localhost:5000 to access the dashboard

### 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.