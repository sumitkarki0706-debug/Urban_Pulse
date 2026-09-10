import { useEffect, useRef } from "react";

interface MapPoint { id: string; lat: number; lng: number; title: string; status: string }

interface Props {
  points?: MapPoint[];
  center?: [number, number];
  zoom?: number;
  height?: number;
  onPick?: (lat: number, lng: number) => void;
  picked?: [number, number] | null;
}

export function ComplaintMap({ points = [], center = [20.5937, 78.9629], zoom = 5, height = 400, onPick, picked }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").Marker[]>([]);
  const pickerRef = useRef<import("leaflet").Marker | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      // fix default icon paths
      // @ts-expect-error internal
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current).setView(center, zoom);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 19,
        }).addTo(mapRef.current);
      }

      // clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      points.forEach((p) => {
        const marker = L.marker([p.lat, p.lng]).addTo(mapRef.current!);
        marker.bindPopup(`<strong>${escapeHtml(p.title)}</strong><br/><span style="text-transform:capitalize">${p.status.replace("_", " ")}</span>`);
        markersRef.current.push(marker);
      });

      if (points.length > 0) {
        const group = L.featureGroup(markersRef.current);
        mapRef.current.fitBounds(group.getBounds().pad(0.2));
      }

      if (onPick) {
        mapRef.current.off("click");
        mapRef.current.on("click", (e: import("leaflet").LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          if (pickerRef.current) pickerRef.current.setLatLng([lat, lng]);
          else pickerRef.current = L.marker([lat, lng]).addTo(mapRef.current!);
          onPick(lat, lng);
        });
      }

      if (picked) {
        if (pickerRef.current) pickerRef.current.setLatLng(picked);
        else pickerRef.current = L.marker(picked).addTo(mapRef.current!);
        mapRef.current.setView(picked, Math.max(mapRef.current.getZoom(), 14));
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points), picked?.[0], picked?.[1]]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ height, width: "100%", borderRadius: 12, overflow: "hidden" }} />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
