import warnings
import logging
from io import BytesIO
from app.settings import settings

with warnings.catch_warnings():
    warnings.filterwarnings("ignore", category=UserWarning, message=".*pkg_resources is deprecated.*")
    import clamd

logger = logging.getLogger(__name__)

class FileScanner:
    def __init__(self):
        try:
            self.cd = clamd.ClamdNetworkSocket(
                host=settings.clamav_host, 
                port=settings.clamav_port,
                timeout=30
            )
        except Exception as e:
            logger.warning(f"Could not connect to ClamAV at {settings.clamav_host}:{settings.clamav_port}. Scanning will be skipped. Error: {e}")
            self.cd = None

    def scan_bytes(self, filename: str, content: bytes) -> bool:
        """
        Scans the provided bytes for malware.
        Returns True if safe, False if malware detected.
        Raises exception if scanning fails (other than connection error).
        """
        if not self.cd:
            return True

        try:
            # instream returns a dict like {'stream': ('FOUND', 'Win.Test.EICAR_HDB-1')}
            # or {'stream': ('OK', None)}
            result = self.cd.instream(BytesIO(content))
            
            if result is None:
                # Should not happen if connected, but handle it
                return True
                
            status, virus_name = result['stream']
            
            if status == 'FOUND':
                logger.error(f"Malware detected in {filename}: {virus_name}")
                return False
            
            return True

        except Exception as e:
            logger.error(f"Error scanning {filename}: {e}")
            raise e
