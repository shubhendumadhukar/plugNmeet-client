import React, { useEffect, useState } from 'react';
// eslint-disable-next-line import/no-unresolved
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types';
import usePreviousPage from './helpers/hooks/usePreviousPage';
import { RootState, store, useAppDispatch, useAppSelector } from '../../store';
import { createSelector } from '@reduxjs/toolkit';
import { setWhiteboardCurrentPage } from '../../store/slices/whiteboard';
import { useTranslation } from 'react-i18next';
import {
  broadcastCurrentPageNumber,
  broadcastScreenDataBySocket,
} from './helpers/handleRequestedWhiteboardData';

interface IFooterUIProps {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}
const totalPagesSelector = createSelector(
  (state: RootState) => state.whiteboard.totalPages,
  (totalPages) => totalPages,
);
const currentPageSelector = createSelector(
  (state: RootState) => state.whiteboard.currentPage,
  (currentPage) => currentPage,
);

const FooterUI = ({ excalidrawAPI }: IFooterUIProps) => {
  const totalPages = useAppSelector(totalPagesSelector);
  const currentPage = useAppSelector(currentPageSelector);
  const [options, setOptions] = useState<Array<JSX.Element>>();
  const [disablePre, setDisablePre] = useState(true);
  const [disableNext, setDisableNext] = useState(false);
  const previousPage = usePreviousPage(currentPage);
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const session = store.getState().session;
  const isAdmin = session.currenUser?.metadata?.is_admin;
  const isRecorder = session.currenUser?.isRecorder;

  useEffect(() => {
    if (previousPage && currentPage !== previousPage && excalidrawAPI) {
      savePreviousPageData();
    }
    //eslint-disable-next-line
  }, [currentPage, previousPage, excalidrawAPI]);

  useEffect(() => {
    if (currentPage > 1) {
      setDisablePre(false);
    }
    if (currentPage === 1) {
      setDisablePre(true);
    }

    if (disableNext) {
      if (currentPage !== totalPages) {
        setDisableNext(false);
      }
    } else {
      if (currentPage === totalPages) {
        setDisableNext(true);
      }
    }
  }, [currentPage, disableNext, totalPages]);

  useEffect(() => {
    const element: Array<JSX.Element> = [];
    for (let i = 0; i < totalPages; i++) {
      element.push(
        <option key={i} value={i + 1}>
          {t('whiteboard.page', { count: i + 1 })}
        </option>,
      );
    }
    setOptions(element);
    //eslint-disable-next-line
  }, [totalPages]);

  useEffect(() => {
    return () => {
      if (excalidrawAPI) {
        const lastPage = store.getState().whiteboard.currentPage;
        const elms = excalidrawAPI.getSceneElementsIncludingDeleted();
        if (elms.length) {
          sessionStorage.setItem(String(lastPage), JSON.stringify(elms));
        }
      }
    };
  }, [excalidrawAPI]);

  const savePreviousPageData = () => {
    if (!excalidrawAPI) {
      return;
    }
    // for other user we'll clean from parent component
    // because from mobile or small screen pagination part remain collapse
    // no event will be run if this part don't show
    if (isAdmin && !isRecorder) {
      const elms = excalidrawAPI.getSceneElementsIncludingDeleted();
      if (elms.length) {
        sessionStorage.setItem(String(previousPage), JSON.stringify(elms));
      }
      cleanExcalidraw();
      displayCurrentPageData(currentPage);
    }
  };

  const displayCurrentPageData = (currentPage) => {
    const data = sessionStorage.getItem(currentPage);
    if (data && excalidrawAPI) {
      const elements = JSON.parse(data);
      if (elements.length) {
        excalidrawAPI.updateScene({ elements });
        if (isAdmin && !isRecorder) {
          // better to broadcast full screen
          broadcastScreenDataBySocket(elements);
        }
      }
    }
  };

  const cleanExcalidraw = () => {
    excalidrawAPI?.updateScene({
      elements: [],
    });
  };

  const setCurrentPage = (page: number) => {
    broadcastCurrentPageNumber(page);
    setTimeout(() => {
      dispatch(setWhiteboardCurrentPage(page));
    }, 500);
  };

  const handlePre = () => {
    setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    setCurrentPage(currentPage + 1);
  };

  const renderForAdmin = () => {
    return (
      <div className="flex pt-1 wb-page-navigation">
        <button
          className="pre w-8 h-8 flex items-center justify-center"
          onClick={handlePre}
          disabled={disablePre}
        >
          <i className="pnm-arrow-left-short text-black text-xl opacity-50" />
        </button>
        <select
          id="pages"
          name="pages"
          className="pagesOpts block h-8 py-1 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          onChange={(e) => setCurrentPage(Number(e.currentTarget.value))}
          value={currentPage}
        >
          {options}
        </select>
        <button
          className="next w-8 h-8 flex items-center justify-center"
          onClick={handleNext}
          disabled={disableNext}
        >
          <i className="pnm-arrow-right-short text-black text-xl opacity-50" />
        </button>
      </div>
    );
  };

  const renderForParticipant = () => {
    return (
      <div className="flex text-sm pt-3">
        {t('whiteboard.page', { count: currentPage })}
      </div>
    );
  };

  return (
    <>{isAdmin && !isRecorder ? renderForAdmin() : renderForParticipant()}</>
  );
};

export default FooterUI;