import React from "react";
import BaseWidget, { WidgetProps } from "./BaseWidget";
import { debounce, fromPairs } from "lodash";
import { EditorContext } from "components/editorComponents/EditorContextProvider";
import AppsmithConsole from "utils/AppsmithConsole";
import { ENTITY_TYPE } from "entities/AppsmithConsole";
import LOG_TYPE from "entities/AppsmithConsole/logtype";
import { ExecuteTriggerPayload } from "constants/AppsmithActionConstants/ActionConstants";
import { connect } from "react-redux";
import { getWidgetMetaProps } from "sagas/selectors";
import { AppState } from "reducers";

export type DebouncedExecuteActionPayload = Omit<
  ExecuteTriggerPayload,
  "dynamicString"
> & {
  dynamicString?: string;
};

export interface WithMeta {
  updateWidgetMetaProperty: (
    propertyName: string,
    propertyValue: unknown,
    actionExecution?: DebouncedExecuteActionPayload,
  ) => void;
}

type WidgetMetaProps = { metaState: Record<string, unknown> };
type metaHOCProps = WidgetProps & WidgetMetaProps;

function withMeta(WrappedWidget: typeof BaseWidget) {
  class MetaHOC extends React.PureComponent<metaHOCProps> {
    static contextType = EditorContext;
    context!: React.ContextType<typeof EditorContext>;

    initialMetaState: Record<string, unknown>;
    actionsToExecuteInBatch: Record<string, DebouncedExecuteActionPayload>;

    constructor(props: metaHOCProps) {
      super(props);
      const metaProperties = WrappedWidget.getMetaPropertiesMap();
      this.initialMetaState = fromPairs(
        Object.keys(metaProperties).map((metaProperty) => {
          return [metaProperty, this.props[metaProperty]];
        }),
      );
      this.actionsToExecuteInBatch = {};
    }

    addActionToBatch = (
      propertyName: string,
      actionExecution: DebouncedExecuteActionPayload,
    ) => {
      this.actionsToExecuteInBatch[propertyName] = actionExecution;
    };

    removeBatchActions = (propertyName: string) => {
      delete this.actionsToExecuteInBatch[propertyName];
    };

    runBatchActions = () => {
      const { executeAction } = this.context;
      const batchActionsToRun = Object.entries(this.actionsToExecuteInBatch);
      batchActionsToRun.map(([propertyName, actionExecution]) => {
        if (actionExecution && actionExecution.dynamicString && executeAction) {
          executeAction({
            ...actionExecution,
            dynamicString: actionExecution.dynamicString, // when we spread the object above check of dynamic string doesn't account for type.
            source: {
              id: this.props.widgetId,
              name: this.props.widgetName,
            },
          });

          // remove action from batch
          this.removeBatchActions(propertyName);

          actionExecution.triggerPropertyName &&
            AppsmithConsole.info({
              text: `${actionExecution.triggerPropertyName} triggered`,
              source: {
                type: ENTITY_TYPE.WIDGET,
                id: this.props.widgetId,
                name: this.props.widgetName,
              },
            });
        }
      });
    };

    handleTriggerEvalOnMetaUpdate = () => {
      const { triggerEvalOnMetaUpdate } = this.context;
      if (triggerEvalOnMetaUpdate) triggerEvalOnMetaUpdate();
      this.runBatchActions();
    };

    debouncedTriggerEvalOnMetaUpdate = debounce(
      this.handleTriggerEvalOnMetaUpdate,
      200,
      {
        leading: true,
        trailing: true,
      },
    );

    updateWidgetMetaProperty = (
      propertyName: string,
      propertyValue: unknown,
      actionExecution?: DebouncedExecuteActionPayload,
    ): void => {
      AppsmithConsole.info({
        logType: LOG_TYPE.WIDGET_UPDATE,
        text: "Widget property was updated",
        source: {
          type: ENTITY_TYPE.WIDGET,
          id: this.props.widgetId,
          name: this.props.widgetName,
          propertyPath: propertyName,
        },
        state: {
          [propertyName]: propertyValue,
        },
      });
      this.handleUpdateWidgetMetaProperty(
        propertyName,
        propertyValue,
        actionExecution,
      );
    };

    handleUpdateWidgetMetaProperty = (
      propertyName: string,
      propertyValue: unknown,
      actionExecution?: DebouncedExecuteActionPayload,
    ) => {
      const { syncUpdateWidgetMetaProperty } = this.context;
      const { widgetId } = this.props;

      if (syncUpdateWidgetMetaProperty) {
        syncUpdateWidgetMetaProperty(widgetId, propertyName, propertyValue);

        // look at this.props.__metaOptions, check for metaPropPath value
        // if they exist, then update the propertyName
        // Below code of updating metaOptions can be removed once we have ListWidget v2 where we better manage meta values of ListWidget.
        const metaOptions = this.props.__metaOptions;
        if (metaOptions) {
          syncUpdateWidgetMetaProperty(
            metaOptions.widgetId,
            `${metaOptions.metaPropPrefix}.${this.props.widgetName}.${propertyName}[${metaOptions.index}]`,
            propertyValue,
          );
        }
      }
      if (actionExecution) this.addActionToBatch(propertyName, actionExecution);
      this.debouncedTriggerEvalOnMetaUpdate();
    };

    updatedProps = () => {
      return {
        ...this.initialMetaState, // this contains stale default values and are used when widget is reset. Ideally, widget should reset to its default values instead of stale default values.
        ...this.props, // if default values are changed we expect to get new values from here.
        ...this.props.metaState,
      };
    };

    render() {
      return (
        <WrappedWidget
          {...this.updatedProps()}
          updateWidgetMetaProperty={this.updateWidgetMetaProperty}
        />
      );
    }
  }

  const mapStateToProps = (state: AppState, ownProps: WidgetProps) => {
    return {
      metaState: getWidgetMetaProps(state, ownProps.widgetId),
    };
  };
  return connect(mapStateToProps)(MetaHOC);
}

export default withMeta;
