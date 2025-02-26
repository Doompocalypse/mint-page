import { memo } from 'react';
import { Box } from '@chakra-ui/react';
import { useIsMobile } from '@/hooks/use-mobile';

const VideoBackground = memo(() => {
  const isMobile = useIsMobile();
  
  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      width="100vw"
      height="100vh"
      zIndex="-1"
      overflow="hidden"
    >
      <Box position="absolute" inset="0">
        <Box
          position="absolute"
          top="50%"
          left="50%"
          width="200vw"
          height="200vh"
          transform="translate(-50%, -50%)"
          overflow="hidden"
        >
          <iframe
            src="https://player.vimeo.com/video/1039284485?background=1&autoplay=1&loop=1&byline=0&title=0&muted=1"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '100%',
              height: '100%',
              transform: `translate(-50%, -50%) scale(${isMobile ? 1.75 : 1.1})`,
              pointerEvents: 'none',
              objectFit: 'cover'
            }}
            loading="lazy"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </Box>
      </Box>
      <Box 
        position="absolute" 
        inset="0" 
        backgroundColor="rgba(0, 0, 0, 0.8)"
      />
    </Box>
  );
});

VideoBackground.displayName = 'VideoBackground';

export default VideoBackground; 