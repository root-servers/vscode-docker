/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as assertEx from './assertEx';
import { commands, OutputChannel, window } from 'vscode';
import { ext } from '../extensionVariables';
import { Suite, Test, Context } from 'mocha';
import { TestTerminalProvider } from '../commands/utils/TerminalProvider';
import { TestUserInput } from 'vscode-azureextensionui';

const registryContainerName = 'test-registry';

suite("Custom registries", async function (this: Suite): Promise<void> {
    this.timeout(Math.max(60 * 1000, this.timeout()));

    const outputChannel: OutputChannel = window.createOutputChannel('Docker extension tests');
    ext.outputChannel = outputChannel;

    let testTerminalProvider = new TestTerminalProvider();
    ext.terminalProvider = testTerminalProvider;
    let registryTerminal = await testTerminalProvider.createTerminal('custom registry');

    async function stopRegistry(): Promise<void> {
        await registryTerminal.execute(
            [
                `docker stop ${registryContainerName}`,
                `docker rm ${registryContainerName}`,
            ],
            {
                ignoreErrors: true
            }
        );
    }

    suite("localhost", async function (this: Suite): Promise<void> {
        this.timeout(Math.max(60 * 1000, this.timeout()));

        suiteSetup(async function (this: Context): Promise<void> {
            await stopRegistry();
            await registryTerminal.execute(`docker run -d --rm --name ${registryContainerName} -p 5100:5000 registry`);

            // Make sure it's running
            await registryTerminal.execute(`curl http://localhost:5100/v2 --silent --show-error`);
        });

        suiteTeardown(async function (this: Context): Promise<void> {
            await stopRegistry();
        });

        test("Connect, no credentials needed", async function (this: Context) {
            let input = new TestUserInput([
                'http://localhost:5100',
                'fake username', // TODO: TestUserInput doesn't currently allow '' as an input
                'fake password'
            ]);
            ext.ui = input;
            await commands.executeCommand('vscode-docker.connectCustomRegistry');

            // TODO: Verify the node is there (have to start using common tree provider first)
        });

        test("Connect with credentials");
        test("Publish to Azure app service with credentials");
        test("Disconnect");
    });
});