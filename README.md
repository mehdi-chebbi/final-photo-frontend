#!/bin/bash
# ============================================
# Kubernetes Complete Removal + Rename Script
# Rename: worker-04 -> worker-03
# ============================================

echo "Starting Kubernetes removal and rename process..."

# ============================================
# STEP 1: Kill all running Kubernetes processes
# ============================================
echo "[1/17] Killing all Kubernetes processes..."
sudo pkill -9 kube        # Kill kubelet, kubectl, kubeadm processes
sudo pkill -9 etcd        # Kill etcd database processes
sudo pkill -9 containerd  # Kill container runtime
sudo pkill -9 dockerd     # Kill docker daemon if present
echo "✓ Processes killed"

# ============================================
# STEP 2: Reset kubeadm configuration
# ============================================
echo "[2/17] Resetting kubeadm (if installed)..."
sudo kubeadm reset -f 2>/dev/null || true
echo "✓ Kubeadm reset complete"

# ============================================
# STEP 3: Stop and disable all K8s services
# ============================================
echo "[3/17] Stopping and disabling services..."
sudo systemctl stop kubelet 2>/dev/null || true
sudo systemctl stop docker 2>/dev/null || true
sudo systemctl stop containerd 2>/dev/null || true
sudo systemctl stop crio 2>/dev/null || true
sudo systemctl disable kubelet 2>/dev/null || true
echo "✓ Services stopped and disabled"

# ============================================
# STEP 4: Remove all Kubernetes directories
# ============================================
echo "[4/17] Removing all Kubernetes directories..."
sudo rm -rf /etc/kubernetes      # Main K8s config directory
sudo rm -rf /var/lib/kubelet     # Kubelet data
sudo rm -rf /var/lib/etcd        # etcd database
sudo rm -rf /var/lib/docker      # Docker data
sudo rm -rf /var/lib/containerd  # Containerd data
sudo rm -rf /var/lib/cni         # CNI plugin data
sudo rm -rf /var/lib/calico      # Calico network data
sudo rm -rf /opt/cni             # CNI binaries
sudo rm -rf /etc/cni             # CNI config
sudo rm -rf /run/kubernetes      # Runtime files
sudo rm -rf /var/run/kubernetes  # Runtime files (alternate location)
sudo rm -rf ~/.kube              # User kubeconfig
sudo rm -rf /root/.kube          # Root kubeconfig
sudo rm -rf /home/*/.kube        # All users' kubeconfigs
sudo rm -rf /var/log/pods        # Pod logs
sudo rm -rf /var/log/containers  # Container logs
echo "✓ Directories removed"

# ============================================
# STEP 5: Uninstall Kubernetes packages
# ============================================
echo "[5/17] Uninstalling Kubernetes packages..."
sudo apt-get purge -y kubeadm kubectl kubelet kubernetes-cni kube* containerd.io docker-ce docker-ce-cli cri-o* 2>/dev/null || true
sudo apt-get autoremove -y
echo "✓ Packages uninstalled"

# ============================================
# STEP 6: Force remove any stuck packages
# ============================================
echo "[6/17] Force removing any stuck packages..."
sudo dpkg --purge kubeadm kubectl kubelet kubernetes-cni containerd.io 2>/dev/null || true
echo "✓ Stuck packages removed"

# ============================================
# STEP 7: Delete virtual network interfaces
# ============================================
echo "[7/17] Removing virtual network interfaces..."
for iface in $(ip link show | grep -E 'cni|flannel|weave|calico|docker|veth' | awk '{print $2}' | cut -d: -f1 | cut -d@ -f1); do
  echo "  Deleting interface: $iface"
  sudo ip link delete $iface 2>/dev/null || true
done
echo "✓ Network interfaces removed"

# ============================================
# STEP 8: Flush all iptables rules
# ============================================
echo "[8/17] Flushing iptables rules..."
sudo iptables -F                 # Flush filter table
sudo iptables -X                 # Delete user-defined chains
sudo iptables -t nat -F          # Flush NAT table
sudo iptables -t nat -X          # Delete NAT chains
sudo iptables -t mangle -F       # Flush mangle table
sudo iptables -t mangle -X       # Delete mangle chains
sudo iptables -t raw -F          # Flush raw table
sudo iptables -t raw -X          # Delete raw chains
sudo iptables -P INPUT ACCEPT    # Set default INPUT policy
sudo iptables -P FORWARD ACCEPT  # Set default FORWARD policy
sudo iptables -P OUTPUT ACCEPT   # Set default OUTPUT policy
echo "✓ iptables rules flushed"

# ============================================
# STEP 9: Clean up systemd unit files
# ============================================
echo "[9/17] Cleaning up systemd unit files..."
sudo rm -rf /etc/systemd/system/kubelet.service.d  # Kubelet drop-in configs
sudo rm -f /etc/systemd/system/kubelet.service     # Kubelet service file
sudo rm -f /usr/lib/systemd/system/kubelet.service # System kubelet service
sudo systemctl daemon-reload                        # Reload systemd
sudo systemctl reset-failed                         # Reset failed units
echo "✓ Systemd cleaned up"

# ============================================
# STEP 10: Remove repository sources and keyrings
# ============================================
echo "[10/17] Removing repository sources..."
sudo rm -f /etc/apt/sources.list.d/kubernetes.list      # K8s apt repo
sudo rm -f /etc/yum.repos.d/kubernetes.repo             # K8s yum repo
sudo rm -f /etc/apt/sources.list.d/docker.list          # Docker apt repo
sudo rm -f /etc/apt/keyrings/kubernetes-apt-keyring.gpg # K8s GPG key
echo "✓ Repository sources removed"

# ============================================
# STEP 11: Remove binary files
# ============================================
echo "[11/17] Removing binary files..."
sudo rm -f /usr/bin/kubeadm  # kubeadm binary
sudo rm -f /usr/bin/kubectl  # kubectl binary
sudo rm -f /usr/bin/kubelet  # kubelet binary
echo "✓ Binaries removed"

# ============================================
# STEP 12: Remove remaining files and docs
# ============================================
echo "[12/17] Removing remaining files..."
sudo rm -rf /usr/libexec/kubernetes           # K8s executables
sudo rm -rf /usr/share/doc/kube*              # K8s documentation
sudo rm -rf /usr/share/doc/kubernetes*        # K8s documentation
sudo rm -rf /var/lib/dpkg/info/kube*          # Package manager info
sudo rm -rf /var/lib/dpkg/info/kubernetes*    # Package manager info
sudo rm -f /etc/default/kubelet               # Kubelet defaults
echo "✓ Remaining files removed"

# ============================================
# STEP 13: Unmount any Kubernetes filesystems
# ============================================
echo "[13/17] Unmounting Kubernetes filesystems..."
sudo umount $(mount | grep kubernetes | awk '{print $3}') 2>/dev/null || true
sudo umount $(mount | grep kubelet | awk '{print $3}') 2>/dev/null || true
echo "✓ Filesystems unmounted"

# ============================================
# STEP 14: Change hostname from worker-04 to worker-03
# ============================================
echo "[14/17] Changing hostname from worker-04 to worker-03..."
sudo hostnamectl set-hostname worker-03
sudo sed -i 's/worker-04/worker-03/g' /etc/hosts
echo "✓ Hostname changed to worker-03"

# ============================================
# STEP 15: Create temporary admin user for rename
# ============================================
echo "[15/17] Creating temporary admin user..."
sudo adduser --disabled-password --gecos "" tempadmin
echo "tempadmin:tempadmin123" | sudo chpasswd
sudo usermod -aG sudo tempadmin
echo "✓ Temporary admin user created (username: tempadmin, password: tempadmin123)"

# ============================================
# STEP 16: Verification check
# ============================================
echo "[16/17] Running verification checks..."
echo -n "  Checking processes... "
ps aux | grep -E 'kube|etcd|containerd' | grep -v grep > /dev/null && echo "⚠ WARNING: Processes still running!" || echo "✓"

echo -n "  Checking binaries... "
which kubectl 2>/dev/null && echo "⚠ WARNING: Binaries still exist!" || echo "✓"

echo -n "  Checking packages... "
dpkg -l | grep -E 'kube|containerd|docker' | grep -v grep > /dev/null && echo "⚠ WARNING: Packages still installed!" || echo "✓"

echo -n "  Checking directories... "
ls /etc/kubernetes 2>/dev/null && echo "⚠ WARNING: Directories still exist!" || echo "✓"

echo -n "  Checking hostname... "
hostname | grep -q "worker-03" && echo "✓" || echo "⚠ WARNING: Hostname not changed!"

# ============================================
# STEP 17: Instructions for username rename
# ============================================
echo "[17/17] Cleanup complete!"
echo ""
echo "=========================================="
echo "IMPORTANT: Username Rename Required"
echo "=========================================="
echo "The hostname has been changed to worker-03"
echo "But the username 'worker-04' needs to be renamed after logout"
echo ""
echo "NEXT STEPS:"
echo "1. This terminal will logout in 10 seconds"
echo "2. SSH back in as: ssh tempadmin@<ip-address>"
echo "3. Password: tempadmin123"
echo "4. Run these commands:"
echo ""
echo "   cd /tmp"
echo "   sudo pkill -9 -u worker-04"
echo "   sudo usermod -l worker-03 worker-04"
echo "   sudo groupmod -n worker-03 worker-04"
echo "   sudo usermod -d /home/worker-03 -m worker-03"
echo "   sudo chown -R worker-03:worker-03 /home/worker-03"
echo ""
echo "5. Logout and SSH as: ssh worker-03@<ip-address>"
echo "6. Remove temp user: sudo deluser --remove-home tempadmin"
echo "7. Reboot: sudo reboot"
echo ""
echo "=========================================="
echo "Press Ctrl+C to cancel logout..."
sleep 10
exit