import _ from 'lodash-es';

import { IModel, State } from 'types/services/models/model';
import {
  IAppInitialConfig,
  IAppModelConfig,
} from 'types/services/models/explorer/createAppModel';

import { getItem, setItem } from 'utils/storage';
import { decode, encode } from 'utils/encoder/encoder';
import getStateFromUrl from 'utils/getStateFromUrl';
import { getCompatibleSelectConfig } from 'utils/app/getCompatibleSelectConfig';

export default function setDefaultAppConfigData<M extends State>({
  config,
  appInitialConfig,
  model,
  recoverTableState = true,
}: {
  config: IAppModelConfig;
  appInitialConfig: IAppInitialConfig;
  model: IModel<M>;
  recoverTableState: boolean;
}): void {
  const { grouping, selectForm, components, appName } = appInitialConfig;

  const liveUpdateConfigHash = getItem(`${appName}LUConfig`);
  const luConfig = liveUpdateConfigHash
    ? JSON.parse(decode(liveUpdateConfigHash))
    : config?.liveUpdate;

  // Backward compatibility, update users storage data if code has change in delay
  // @ts-ignore
  if (luConfig.delay !== config?.liveUpdate.delay) {
    // @ts-ignore
    luConfig.delay = config?.liveUpdate.delay;
    setItem(`${appName}LuConfig`, encode(luConfig));
  }
  ///

  const defaultConfig: IAppModelConfig = { liveUpdate: luConfig };

  if (grouping) {
    defaultConfig.grouping = getStateFromUrl('grouping') ?? {};
  }
  if (selectForm) {
    const compatibleSelectConfig = getCompatibleSelectConfig(
      ['metrics', 'params', 'images'],
      getStateFromUrl('select'),
    );
    defaultConfig.select = compatibleSelectConfig ?? {};
  }
  if (components.charts) {
    defaultConfig.chart = getStateFromUrl('chart') ?? {};
  }
  if (recoverTableState && components.table) {
    const tableConfigHash = getItem(`${appName}Table`);
    defaultConfig.table = tableConfigHash
      ? JSON.parse(decode(tableConfigHash))
      : config?.table;
  }
  const configData: IAppModelConfig = _.mergeWith(
    {},
    model.getState().config,
    defaultConfig,
    (objValue, srcValue) => {
      if (_.isArray(objValue)) {
        return srcValue;
      }
    },
  );
  model.setState({ config: configData });
}
