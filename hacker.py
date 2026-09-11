#!/usr/bin/env python3
"""
⚡ HACKER TERMINAL SIMULATOR ⚡
Rode com: python3 hacker.py
Pressione Ctrl+C para sair ou fugir do rastreamento.
"""

import sys
import time
import random
import os

# Códigos de Cores ANSI
G = '\033[92m'   # Verde matrix
DG = '\033[32m'  # Verde escuro
R = '\033[91m'   # Vermelho alerta
C = '\033[96m'   # Ciano tech
Y = '\033[93m'   # Amarelo aviso
W = '\033[97m'   # Branco
M = '\033[95m'   # Magenta
B = '\033[1m'    # Negrito
DIM = '\033[2m'  # Dim
RST = '\033[0m'  # Reset

BANNER = f"""{G}{B}
  ██████╗██╗   ██╗██████╗ ███████╗██████╗       ██╗██████╗ 
 ██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗     ███║██╔══██╗
 ██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝     ╚██║██████╔╝
 ██║       ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗      ██║██╔═══╝ 
 ╚██████╗   ██║   ██████╔╝███████╗██║  ██║      ██║██║     
  ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝      ╚═╝╚═╝     
       >>> INITIATING CYBERPUNK KERNEL OVERRIDE <<<
{RST}"""

LOG_ACTIONS = [
    "Bypassing quantum-layer firewall [PORT 8083]...",
    "Injecting zero-day payload into ring0 hypervisor...",
    "Intercepting BGP routing table across nodes...",
    "Decrypting SHA-512 RSA salted handshake token...",
    "Dumping SQLite credentials from /var/lib/vault...",
    "Spoofing MAC address -> 00:1A:2B:3C:4D:5E...",
    "Hijacking satellite transponder uplink [GEO-ORBIT-4]...",
    "Establishing encrypted peer-to-peer darknet bridge...",
    "Corrupting memory buffer at pointer 0x7FFF5FBFF8B0...",
    "Extracting root private keys from HSM module...",
    "Overclocking quantum lattice decryptor to 4.8 GHz...",
    "Patching kernel bytecode: NOP slide injected...",
    "Target defense response spoofed: STATUS_NORMAL...",
    "Bypassing biometric telemetry scanner...",
    "SYN-FLOOD packet storm deployed across target subnet..."
]

HEX_CHARS = "0123456789ABCDEF"
MATRIX_CHARS = "ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789ABCDEF$#@*+=-~"

def slow_type(text, delay=0.02, color=G):
    for char in text:
        sys.stdout.write(f"{color}{char}{RST}")
        sys.stdout.flush()
        time.sleep(delay)
    print()

def hex_dump():
    for _ in range(random.randint(15, 30)):
        addr = f"0x{random.randint(0x10000000, 0x7FFFFFFF):08X}"
        hex_part = " ".join("".join(random.choices(HEX_CHARS, k=2)) for _ in range(16))
        ascii_part = "".join(random.choice("abcdefghijklmnopqrstuvwxyz0123456789_.$#@!&") for _ in range(16))
        color = random.choice([G, DG, C])
        print(f"{DIM}{addr}{RST}  {color}{hex_part}{RST}  {W}|{ascii_part}|{RST}")
        time.sleep(random.uniform(0.01, 0.04))

def matrix_stream():
    width = os.get_terminal_size().columns if hasattr(os, 'get_terminal_size') else 80
    for _ in range(random.randint(25, 45)):
        line = ""
        for _ in range(width):
            if random.random() < 0.15:
                char = random.choice(MATRIX_CHARS)
                color = random.choice([G, W, DG, B + G])
                line += f"{color}{char}{RST}"
            else:
                line += " "
        print(line)
        time.sleep(0.03)

def brute_force_cracker():
    target = f"HASH-{random.randint(100000, 999999)}-SECRET"
    print(f"\n{Y}[*] BRUTE-FORCING TARGET KEY: {W}{target}{RST}")
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    current = ["*"] * len(target)
    
    for i in range(len(target)):
        for _ in range(8):
            current[i] = random.choice(chars)
            sys.stdout.write(f"\r{Y}[+] Attempting combinations: {C}{''.join(current)}{RST}")
            sys.stdout.flush()
            time.sleep(0.015)
        current[i] = target[i]
    print(f"\r{G}{B}[✓] CRACKED SUCCESSFULLY: {W}{target}{RST}\n")
    time.sleep(0.3)

def log_feed():
    for _ in range(random.randint(6, 12)):
        action = random.choice(LOG_ACTIONS)
        latency = random.randint(3, 42)
        code = random.choice(["200 OK", "INJECTED", "0x00 SUCCESS", "BYPASSED", "DECRYPTED"])
        status_color = random.choice([G, C, B + G])
        print(f"{DIM}[{time.strftime('%H:%M:%S')}.{random.randint(100,999)}]{RST} {W}{action:<60}{RST} -> {status_color}[{code} - {latency}ms]{RST}")
        time.sleep(random.uniform(0.05, 0.18))

def system_alert():
    alerts = [
        ("CRITICAL SYSTEM ALERT", "INTRUSION DETECTION SYSTEM COUNTERED", R),
        ("ACCESS GRANTED", "ROOT PRIVILEGES ELEVATED TO RING-0", G),
        ("PROXY CHAIN SYNCHRONIZED", "7 HOP PROXY ROUTED THROUGH TOR NODES", C),
        ("MAIN ACCESS TUNNEL ESTABLISHED", "UPLINK SPEED: 104.2 GB/s", Y)
    ]
    title, desc, color = random.choice(alerts)
    print(f"\n{color}{B}╔{'═' * 62}╗{RST}")
    print(f"{color}{B}║  🚨  {title.center(54)}  🚨  ║{RST}")
    print(f"{color}{B}║      {desc.center(54)}      ║{RST}")
    print(f"{color}{B}╚{'═' * 62}╝{RST}\n")
    time.sleep(0.5)

def main():
    os.system('clear' if os.name == 'posix' else 'cls')
    print(BANNER)
    slow_type("Initializing CyberCore Exploit Toolkit v4.9.2...", 0.02, C)
    slow_type("Target: NODE-CENTRAL-09 [192.168.1.137:8080]", 0.01, Y)
    slow_type("Encrypting local socket and spoofing hardware fingerprint...\n", 0.01, G)
    time.sleep(0.4)

    sequences = [log_feed, hex_dump, matrix_stream, brute_force_cracker, system_alert]

    try:
        while True:
            choice = random.choice(sequences)
            choice()
            time.sleep(random.uniform(0.1, 0.4))
    except KeyboardInterrupt:
        print(f"\n\n{R}{B}[!] ABORT SIGNAL RECEIVED - PURGING TRACES...{RST}")
        time.sleep(0.3)
        slow_type("[*] Overwriting memory cache with zeros...", 0.01, Y)
        slow_type("[*] Destroying temporary darknet sockets...", 0.01, Y)
        slow_type("[✓] LOGS CLEARED. DISCONNECTED CLEANLY. 🕶️", 0.02, G)
        print(f"{RST}")

if __name__ == "__main__":
    main()
