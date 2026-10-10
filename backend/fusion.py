import math
import uuid
from typing import List, Set
from backend.schemas import GeotaggedDetection, FusedTarget, GeoJSONPoint

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance in meters between two WGS84 points 
    on the earth (specified in decimal degrees).
    """
    R = 6371000.0  # Radius of earth in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0)**2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0)**2
        
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class GeospatialFuser:
    """
    Merges duplicate or overlapping AI detections from different sonar passes 
    into unified geospatial targets based on geographic distance.
    """
    
    @staticmethod
    def cluster_detections(detections: List[GeotaggedDetection], threshold_m: float = 15.0) -> List[FusedTarget]:
        """
        Greedy clustering algorithm for geospatial grouping.
        O(N^2) complexity, suitable for the typical number of detections per mission (N < 10,000).
        """
        if not detections:
            return []
            
        unvisited: Set[int] = set(range(len(detections)))
        clusters: List[List[GeotaggedDetection]] = []
        
        while unvisited:
            current_idx = unvisited.pop()
            current_det = detections[current_idx]
            
            # Start a new cluster
            current_cluster = [current_det]
            
            # Find all neighbors within the distance threshold
            neighbors_to_remove = set()
            for other_idx in unvisited:
                other_det = detections[other_idx]
                
                # Calculate distance between centroids
                dist = haversine_distance(
                    current_det.geometry.centroid_wgs84.latitude,
                    current_det.geometry.centroid_wgs84.longitude,
                    other_det.geometry.centroid_wgs84.latitude,
                    other_det.geometry.centroid_wgs84.longitude
                )
                
                if dist <= threshold_m:
                    current_cluster.append(other_det)
                    neighbors_to_remove.add(other_idx)
                    
            # Remove all clustered items from the unvisited set
            unvisited -= neighbors_to_remove
            clusters.append(current_cluster)
            
        # Convert clusters to FusedTargets
        fused_results = []
        for cluster in clusters:
            fused_results.append(GeospatialFuser._aggregate_cluster(cluster))
            
        return fused_results
        
    @staticmethod
    def _aggregate_cluster(cluster: List[GeotaggedDetection]) -> FusedTarget:
        """Aggregates a list of detections into a single FusedTarget."""
        fused_id = f"fused_{uuid.uuid4().hex[:8]}"
        
        # Determine primary label (most common label in cluster)
        labels = [d.label for d in cluster]
        primary_label = max(set(labels), key=labels.count)
        
        # Max confidence
        max_conf = max(d.confidence for d in cluster)
        
        # Average center point
        avg_lat = sum(d.geometry.centroid_wgs84.latitude for d in cluster) / len(cluster)
        avg_lon = sum(d.geometry.centroid_wgs84.longitude for d in cluster) / len(cluster)
        
        # Calculate cluster radius (max distance from new center to any detection in cluster)
        max_dist_to_center = 0.0
        for d in cluster:
            dist = haversine_distance(
                avg_lat, avg_lon,
                d.geometry.centroid_wgs84.latitude,
                d.geometry.centroid_wgs84.longitude
            )
            max_dist_to_center = max(max_dist_to_center, dist)
            
        contributing_ids = [d.detection_id for d in cluster]
        
        return FusedTarget(
            fused_id=fused_id,
            label=primary_label,
            max_confidence=max_conf,
            center_wgs84=GeoJSONPoint(latitude=avg_lat, longitude=avg_lon),
            contributing_detection_ids=contributing_ids,
            cluster_radius_m=round(max_dist_to_center, 2)
        )
