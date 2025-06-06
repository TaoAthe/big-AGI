import * as React from 'react';

import { Box, CircularProgress, IconButton, Sheet, SvgIconProps } from '@mui/joy';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';

import { GoodTooltip } from '~/common/components/GoodTooltip';
import { TooltipOutlined } from '~/common/components/TooltipOutlined';

import { rayControlsMobileSx, rayControlsSx } from '../scatter/BeamRay';

import type { BFusion } from './beam.gather';
import type { FusionFactorySpec } from './instructions/beam.gather.factories';


export const FusionControlsMemo = React.memo(FusionControls);

function FusionControls(props: {
  fusion: BFusion,
  factory: FusionFactorySpec,
  isFusing: boolean,
  isInterrupted: boolean,
  isMobile: boolean,
  isUsable: boolean,
  llmComponent?: React.ReactNode,
  llmLabel: string,
  llmVendorIcon?: React.FunctionComponent<SvgIconProps>,
  fusionAvatarTooltip: React.ReactNode,
  onIconClick?: (event: React.MouseEvent) => void,
  onRemove: () => void,
  onToggleGenerate: () => void,
}) {
  return (
    <Box sx={props.isMobile ? rayControlsMobileSx : rayControlsSx}>

      {/* LLM Icon with Tooltip - Clickable to toggle selector */}
      <TooltipOutlined asLargePane enableInteractive title={props.fusionAvatarTooltip || props.llmLabel} placement='top-start'>
        {/*<Box sx={{ display: 'flex' }} onClick={props.onIconClick}>*/}
        {/*  <props.llmVendorIcon sx={{ fontSize: 'lg', my: 'auto' }} />*/}
        {/*</Box>*/}
        <IconButton
          size='sm'
          variant={props.llmComponent ? 'plain' : 'plain'}
          onClick={props.onIconClick}
          sx={{
            m: '-7px',
            // minWidth: 'unset',
            // minHeight: 'unset',
            zIndex: 1, // only for the outline to go over the selector border
            transition: 'all 0.2s',
            '&:hover': {
              opacity: 1,
              transform: 'scale(1.1)',
              backgroundColor: 'transparent',
            },
          }}
        >
          {props.llmVendorIcon ? <props.llmVendorIcon sx={{ fontSize: 'lg' }} /> : <BuildCircleIcon sx={{ fontSize: 'lg' }} />}
        </IconButton>
      </TooltipOutlined>

      {/* Title Box OR LLM Selector */}
      {props.llmComponent ? (
        // Show LLM selector in place of title box
        <Box sx={{ flex: 1 }}>
          {props.llmComponent}
        </Box>
      ) : (
        // Show title box
        <Sheet
          variant='outlined'
          // color={GATHER_COLOR}
          sx={{
            // backgroundColor: `${GATHER_COLOR}.softBg`,
            flex: 1,
            borderRadius: 'sm',
            minHeight: '2rem',
            pl: 1,
            // layout
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >

          {/* [progress] Spinner | Factory Icon */}
          {props.fusion.fusingProgressComponent ? (
            <CircularProgress color='neutral' size='sm' sx={{ '--CircularProgress-size': '16px', '--CircularProgress-trackThickness': '2px' }} />
          ) : (
            !!props.factory.Icon && <props.factory.Icon sx={{ fontSize: 'lg' }} />
          )}

          {/* [progress] Component | Title */}
          {props.fusion.fusingProgressComponent
            // Show the progress in place of the title
            ? props.fusion.fusingProgressComponent
            : (
              <Box sx={{ fontSize: 'sm', fontWeight: 'md' }}>
                {props.factory.cardTitle} {props.isInterrupted && <em> - Interrupted</em>}
              </Box>
            )}
        </Sheet>
      )}

      {/* Generate / Stop Button */}
      {!props.isFusing ? (
        <GoodTooltip title={!props.isUsable ? 'Start Merge' : 'Retry'}>
          <IconButton size='sm' variant='plain' color='success' onClick={props.onToggleGenerate}>
            {!props.isUsable ? <PlayArrowRoundedIcon sx={{ fontSize: 'xl2' }} /> : <ReplayRoundedIcon />}
          </IconButton>
        </GoodTooltip>
      ) : (
        <GoodTooltip title='Stop'>
          <IconButton size='sm' variant='plain' color='danger' onClick={props.onToggleGenerate}>
            <StopRoundedIcon />
          </IconButton>
        </GoodTooltip>
      )}

      {/* Remove Button */}
      <GoodTooltip title='Remove'>
        <IconButton size='sm' variant='plain' color='neutral' onClick={props.onRemove}>
          <RemoveCircleOutlineRoundedIcon />
        </IconButton>
      </GoodTooltip>
    </Box>
  );
}