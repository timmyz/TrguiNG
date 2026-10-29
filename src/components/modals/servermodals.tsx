/**
 * TrguiNG - next gen remote GUI for transmission torrent daemon
 * Copyright (C) 2023  qu1ck (mail at qu1ck.org)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useDisclosure } from "@mantine/hooks";
import React, { memo, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { EditLabelsModal } from "./editlabels";
import { RemoveModal } from "./remove";
import { MoveModal } from "./move";
import { AddMagnet, AddTorrent } from "./add";
import { DaemonSettingsModal } from "./daemon";
import { EditTorrent } from "./edittorrent";
import type { ServerTabsRef } from "components/servertabs";
import { EditTrackers } from "./edittrackers";
const { TAURI, appWindow } = await import(/* webpackChunkName: "taurishim" */"taurishim");

export interface ModalCallbacks {
    setLabels: () => void,
    remove: () => void,
    move: () => void,
    addMagnet: () => void,
    addTorrent: () => void,
    daemonSettings: () => void,
    editTrackers: () => void,
    editTorrent: () => void,
}

interface ServerModalsProps {
    serverName: string,
    runUpdates: (run: boolean) => void,
    tabsRef: React.RefObject<ServerTabsRef>,
}

function usePausingModalState(runUpdates: (run: boolean) => void): [boolean, () => void, () => void] {
    const [opened, { open, close }] = useDisclosure(false);

    const pauseOpen = useCallback(() => {
        runUpdates(false);
        open();
    }, [runUpdates, open]);

    const closeResume = useCallback(() => {
        close();
        runUpdates(true);
    }, [runUpdates, close]);

    return [opened, pauseOpen, closeResume];
}

const urlAddParam = new URLSearchParams(window.location.search).get("add");
if (urlAddParam != null && urlAddParam !== "") {
    const newUrl = new URL(window.location.href);
    newUrl.search = "";
    window.history.pushState("", "", newUrl.toString());
}

function isMagnetUri(item: string | File): boolean {
    return typeof item === "string" && item.startsWith("magnet:?");
}

// 取队列头部连续的同类项作为一批，交给同一个弹窗批量处理
function takeBatch(queue: Array<string | File>): Array<string | File> {
    if (queue.length === 0) return [];

    const magnet = isMagnetUri(queue[0]);
    const batch = [queue[0]];
    for (let i = 1; i < queue.length; i++) {
        if (isMagnetUri(queue[i]) !== magnet) break;
        batch.push(queue[i]);
    }
    return batch;
}

const ServerModals = React.forwardRef<ModalCallbacks, ServerModalsProps>(function ServerModals(props, ref) {
    const [showAddMagnetModal, { open: openAddMagnetModal, close: closeAddMagnetModal }] = useDisclosure(false);
    const [showAddTorrentModal, { open: openAddTorrentModal, close: closeAddTorrentModal }] = useDisclosure(false);

    const [showLabelsModal, openLabelsModal, closeLabelsModal] = usePausingModalState(props.runUpdates);
    const [showRemoveModal, openRemoveModal, closeRemoveModal] = usePausingModalState(props.runUpdates);
    const [showMoveModal, openMoveModal, closeMoveModal] = usePausingModalState(props.runUpdates);
    const [showDaemonSettingsModal, openDaemonSettingsModal, closeDaemonSettingsModal] = usePausingModalState(props.runUpdates);
    const [showEditTrackersModal, openEditTrackersModal, closeEditTrackersModal] = usePausingModalState(props.runUpdates);
    const [showEditTorrentModal, openEditTorrentModal, closeEditTorrentModal] = usePausingModalState(props.runUpdates);

    useImperativeHandle(ref, () => ({
        setLabels: openLabelsModal,
        remove: openRemoveModal,
        move: openMoveModal,
        addMagnet: openAddMagnetModal,
        addTorrent: openAddTorrentModal,
        daemonSettings: openDaemonSettingsModal,
        editTrackers: openEditTrackersModal,
        editTorrent: openEditTorrentModal,
    }));

    const [addQueue, setAddQueue] = useState<Array<string | File>>(urlAddParam != null ? [urlAddParam] : []);
    // 当前交给弹窗批量处理的一批种子文件/磁力链接
    const [activeUris, setActiveUris] = useState<Array<string | File>>([]);

    const enqueue = useCallback((paths: string[] | File[]) => {
        setAddQueue((queue) => [...queue, ...paths]);
        void appWindow.show();
        void appWindow.unminimize();
        void appWindow.setFocus();
        void appWindow.emit("window-shown");
    }, []);

    useEffect(() => {
        if (TAURI) {
            const dropResult = appWindow.onDragDropEvent((event) => {
                if (event.payload.type === "drop") {
                    const files = event.payload.paths.filter((path) => path.toLowerCase().endsWith(".torrent"));
                    if (files.length > 0) enqueue(files);
                }
            });
            return () => {
                void dropResult.then((unlisten) => {
                    unlisten();
                });
            };
        } else {
            document.ondragover = (e) => {
                e.preventDefault();
            };
            document.ondrop = (event) => {
                event.preventDefault();

                if (event.dataTransfer?.items !== undefined) {
                    const files = [...event.dataTransfer.items]
                        .filter((i) => i.kind === "file")
                        .map((f) => f.getAsFile() as File);
                    if (files.length > 0) enqueue(files);
                }
            };

            return () => {
                document.ondragover = null;
                document.ondrop = null;
            };
        }
    }, [enqueue]);

    useEffect(() => {
        const listenResult = appWindow.listen<string>("app-arg", (event) => {
            const args = JSON.parse(event.payload) as string[];
            console.log("Got app-arg:", args);
            enqueue(args);
        }).then((unlisten) => {
            void appWindow.emit("listener-start", {});
            return unlisten;
        });

        return () => {
            void listenResult.then((unlisten) => {
                unlisten();
            });
        };
    }, [enqueue]);

    useEffect(() => {
        if (addQueue.length > 0 && !showAddMagnetModal && !showAddTorrentModal) {
            // 一次只打开一个弹窗，弹窗内批量处理这一批文件
            const batch = takeBatch(addQueue);
            setActiveUris(batch);
            if (isMagnetUri(batch[0])) {
                openAddMagnetModal();
            } else {
                openAddTorrentModal();
            }
        }
    }, [addQueue, showAddMagnetModal, showAddTorrentModal, openAddMagnetModal, openAddTorrentModal]);

    // 弹窗关闭后把已处理的一批从队列中移除，再处理下一批
    const popBatch = useCallback(() => {
        const count = activeUris.length;
        setActiveUris([]);
        setAddQueue((queue) => queue.slice(count));
    }, [activeUris]);

    const closeAddMagnetModalAndPop = useCallback(() => {
        closeAddMagnetModal();
        popBatch();
    }, [closeAddMagnetModal, popBatch]);

    const closeAddTorrentModalAndPop = useCallback(() => {
        closeAddTorrentModal();
        popBatch();
    }, [closeAddTorrentModal, popBatch]);

    return <>
        <EditLabelsModal opened={showLabelsModal} close={closeLabelsModal} />
        <RemoveModal opened={showRemoveModal} close={closeRemoveModal} />
        <MoveModal opened={showMoveModal} close={closeMoveModal} />
        <AddMagnet
            serverName={props.serverName}
            uris={activeUris}
            tabsRef={props.tabsRef}
            opened={showAddMagnetModal}
            close={closeAddMagnetModalAndPop}
        />
        <AddTorrent
            serverName={props.serverName}
            uris={activeUris}
            tabsRef={props.tabsRef}
            opened={showAddTorrentModal}
            close={closeAddTorrentModalAndPop}
        />
        <DaemonSettingsModal opened={showDaemonSettingsModal} close={closeDaemonSettingsModal} />
        <EditTrackers opened={showEditTrackersModal} close={closeEditTrackersModal} />
        <EditTorrent opened={showEditTorrentModal} close={closeEditTorrentModal} />
    </>;
});

export const MemoizedServerModals = memo(ServerModals) as typeof ServerModals;
