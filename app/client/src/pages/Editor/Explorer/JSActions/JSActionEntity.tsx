import React, { memo, useCallback } from "react";
import Entity, { EntityClassNames } from "../Entity";
import { JS_COLLECTION_ID_URL } from "constants/routes";
import history from "utils/history";
import JSCollectionEntityContextMenu from "./JSActionContextMenu";
import { saveJSObjectName } from "actions/jsActionActions";
import { useSelector } from "react-redux";
import {
  getCurrentApplicationId,
  getCurrentPageId,
} from "selectors/editorSelectors";
import { getJSCollection } from "selectors/entitiesSelector";
import { AppState } from "reducers";
import { JSCollection } from "entities/JSCollection";
import { jsFileIcon } from "../ExplorerIcons";

type ExplorerJSCollectionEntityProps = {
  step: number;
  searchKeyword?: string;
  id: string;
  isActive: boolean;
};

const getUpdateJSObjectName = (id: string, name: string) => {
  return saveJSObjectName({ id, name });
};

export const ExplorerJSCollectionEntity = memo(
  (props: ExplorerJSCollectionEntityProps) => {
    const applicationId = useSelector(getCurrentApplicationId);
    const pageId = useSelector(getCurrentPageId) as string;
    const jsAction = useSelector((state: AppState) =>
      getJSCollection(state, props.id),
    ) as JSCollection;
    const navigateToJSCollection = useCallback(() => {
      history.push(
        JS_COLLECTION_ID_URL(applicationId, pageId, jsAction.id, {}),
      );
    }, [pageId]);
    const contextMenu = (
      <JSCollectionEntityContextMenu
        className={EntityClassNames.CONTEXT_MENU}
        id={jsAction.id}
        name={jsAction.name}
        pageId={pageId}
      />
    );
    return (
      <Entity
        action={navigateToJSCollection}
        active={props.isActive}
        className="t--jsaction"
        contextMenu={contextMenu}
        entityId={jsAction.id}
        icon={jsFileIcon}
        key={jsAction.id}
        name={jsAction.name}
        searchKeyword={props.searchKeyword}
        step={props.step}
        updateEntityName={getUpdateJSObjectName}
      >
        {/* <EntityProperties
          entity={props.action}
          entityId={jsAction.id}
          entityName={jsAction.name}
          entityType={ENTITY_TYPE.JSACTION}
          pageId={pageId}
          step={props.step + 1}
        /> */}
      </Entity>
    );
  },
);

ExplorerJSCollectionEntity.displayName = "ExplorerJSCollectionEntity";

export default ExplorerJSCollectionEntity;
