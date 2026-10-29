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

import { useTranslation } from "react-i18next";
import { Button, Checkbox, Divider, Group, Text } from "@mantine/core";
import type { ModalState } from "./common";
import { HkModal, TorrentsNames } from "./common";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useRemoveTorrents } from "queries";
import { notifications } from "@mantine/notifications";
import type { Torrent } from "rpc/torrent";
import { useServerSelectedTorrents, useServerTorrentData } from "rpc/torrent";
import { ConfigContext } from "config";
import { ensurePathDelimiter, fileSystemSafeName } from "trutil";

function torrentDataPath(torrent: Torrent) {
    return ensurePathDelimiter(torrent.downloadDir) + fileSystemSafeName(torrent.name);
}

// Splits the selected torrents into those whose data can be safely deleted
// (no other torrent uses the same data path) and those that have to keep their data.
function splitSelectedByDataUsage(torrents: Torrent[], selected: Set<number>) {
    const selectedTorrents = torrents.filter((torrent) => selected.has(torrent.id));

    const pathUsage = new Map<string, number>();
    selectedTorrents.forEach((torrent) => pathUsage.set(torrentDataPath(torrent), 0));
    torrents.forEach((torrent) => {
        const count = pathUsage.get(torrentDataPath(torrent));
        if (count !== undefined) pathUsage.set(torrentDataPath(torrent), count + 1);
    });
    selectedTorrents.forEach((torrent) => {
        const count = pathUsage.get(torrentDataPath(torrent));
        if (count !== undefined) pathUsage.set(torrentDataPath(torrent), count - 1);
    });

    const deleteDataIds: number[] = [];
    const keepDataIds: number[] = [];
    selectedTorrents.forEach((torrent) => {
        const count = pathUsage.get(torrentDataPath(torrent)) ?? 0;
        if (count === 0) {
            deleteDataIds.push(torrent.id);
        } else {
            keepDataIds.push(torrent.id);
        }
    });
    return { deleteDataIds, keepDataIds };
}

export function RemoveModal(props: ModalState) {
    const { t } = useTranslation();
    const config = useContext(ConfigContext);
    const serverSelected = useServerSelectedTorrents();
    const serverData = useServerTorrentData();
    const [deleteData, setDeleteData] = useState<boolean>(false);
    const [deleteDataWhenOne, setDeleteDataWhenOne] = useState<boolean>(false);

    useEffect(() => {
        if (props.opened) {
            if (config.values.interface.deleteTorrentData !== "remember selection") {
                setDeleteData(config.values.interface.deleteTorrentData === "default on");
            } else {
                setDeleteData(config.values.interface.deleteTorrentDataSelection);
            }
            setDeleteDataWhenOne(config.values.interface.deleteTorrentDataWhenOneSelection);
        }
    }, [config, props.opened]);

    const onDeleteDataChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.currentTarget.checked;
        if (value) {
            setDeleteDataWhenOne(false);
            config.values.interface.deleteTorrentDataWhenOneSelection = false;
        }
        setDeleteData(value);
        config.values.interface.deleteTorrentDataSelection = value;
    }, [config]);

    const onDeleteDataWhenOneChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.currentTarget.checked;
        if (value) {
            setDeleteData(false);
            config.values.interface.deleteTorrentDataSelection = false;
        }
        setDeleteDataWhenOne(value);
        config.values.interface.deleteTorrentDataWhenOneSelection = value;
    }, [config]);

    const remove = useRemoveTorrents();

    const onRemoveError = useCallback((e: unknown) => {
        console.error("Error removing torrents", e);
        notifications.show({
            message: t("remove.errorRemoving"),
            color: "red",
        });
    }, [t]);

    const onDelete = useCallback(() => {
        if (deleteDataWhenOne) {
            const { deleteDataIds, keepDataIds } = splitSelectedByDataUsage(serverData.torrents, serverSelected);
            if (keepDataIds.length > 0) {
                remove(
                    {
                        torrentIds: keepDataIds,
                        deleteData: false,
                    },
                    { onError: onRemoveError },
                );
            }
            if (deleteDataIds.length > 0) {
                remove(
                    {
                        torrentIds: deleteDataIds,
                        deleteData: true,
                    },
                    { onError: onRemoveError },
                );
            }
        } else {
            remove(
                {
                    torrentIds: Array.from(serverSelected),
                    deleteData,
                },
                { onError: onRemoveError },
            );
        }
        props.close();
    }, [remove, serverData, serverSelected, deleteData, deleteDataWhenOne, onRemoveError, props]);

    return (
        <HkModal
            opened={props.opened}
            onClose={props.close}
            title={t("remove.title")}
            centered
            size="lg"
        >
            <Divider my="sm" />
            <Text mb="md">{t("remove.confirmation")}</Text>
            <TorrentsNames />
            <Checkbox
                label={t("remove.deleteData")}
                checked={deleteData}
                onChange={onDeleteDataChanged}
                my="xl"
            />
            <Checkbox
                label={t("remove.deleteDataWhenOneSelection")}
                checked={deleteDataWhenOne}
                onChange={onDeleteDataWhenOneChanged}
                my="xl"
            />
            <Divider my="sm" />
            <Group justify="center" gap="md">
                <Button
                    onClick={onDelete}
                    variant="filled"
                    color="red"
                    data-autofocus
                >
                    {deleteData || deleteDataWhenOne ? t("remove.delete") : t("remove.remove")}
                </Button>
                <Button onClick={props.close} variant="light">{t("remove.cancel")}</Button>
            </Group>
        </HkModal>
    );
}
