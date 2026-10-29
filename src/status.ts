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

/**
 * Runtime status of the app, displayed in the run status panel.
 */
export class RunStatus {
    /** True when there is nothing to report and the panel shows the default info. */
    ide: boolean = true;
    /** Title of the status panel. */
    title: string | undefined = "";
    /** Content of the status panel. */
    content: string | undefined = "";

    constructor(ide: boolean = true, title: string | undefined = undefined, content: string | undefined = undefined) {
        this.ide = ide;
        this.title = title;
        this.content = content;
    }
}
